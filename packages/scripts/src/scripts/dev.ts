import webpack from 'webpack';
import { WebSocket, WebSocketServer } from 'ws';
import getPort, { portNumbers } from 'get-port';

import Logger from '../utils/logger';
import { getConfig } from '../webpack/getConfig';
import { getEntries } from '../webpack/getEntries';

// Track WebSocket connections and webpack watcher
let wss: WebSocketServer | null = null;
let webpackWatcher: webpack.Watching | null = null;

async function setupWebSocketServer(preferredPort: number): Promise<number> {
  if (wss) {
    wss.close();
    wss = null;
  }

  // Find an available port starting from the preferred port and counting up
  const ports = [preferredPort, ...portNumbers(preferredPort + 1, preferredPort + 100)];
  const availablePort = await getPort({ port: ports });

  wss = new WebSocketServer({ port: availablePort });

  wss.on('connection', (ws) => {
    ws.on('error', (error) => {
      Logger.error('WebSocket error:', error);
    });
  });

  Logger.info(`WebSocket server started on port ${availablePort}`);
  return availablePort;
}

function notifyClientsToReload(changedFiles: string[], entries: ReturnType<typeof getEntries>) {
  if (!wss) {
    return;
  }

  // Determine which entry types have changed
  const backgroundChanged = Object.keys(entries.background).some((entry) =>
    changedFiles.some((file) => file.includes(entry)),
  );

  const contentScriptChanged = Object.keys(entries.contentScript).some((entry) =>
    changedFiles.some((file) => file.includes(entry)),
  );

  const extensionPageChanged = Object.keys(entries.extensionPage).some((entry) =>
    changedFiles.some((file) => file.includes(entry)),
  );

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      if (backgroundChanged || contentScriptChanged) {
        // If background or content scripts changed, reload both in sequence
        client.send('reload-background');
        Logger.info('Sent reload signal to background script');

        // Add a small delay before reloading content scripts
        setTimeout(() => {
          client.send('reload-content');
          Logger.info('Sent reload signal to content scripts');
        }, 500); // 1 second delay to ensure background loads first
      } else if (extensionPageChanged) {
        // If only extension page changed, reload only that
        client.send('reload-page');
        Logger.info('Sent reload signal to extension pages');
      }
    }
  });
}

export async function dev(options: { port: number; reload: boolean; verbose: boolean }) {
  Logger.info('Starting development build...');

  let actualPort = options.port;

  // Only start WebSocket server if auto reload is enabled
  if (options.reload !== false) {
    actualPort = await setupWebSocketServer(options.port);
  }

  const entries = getEntries();

  const config = getConfig({
    entry: entries,
    mode: 'development',
    port: actualPort,
    reload: options.reload,
  });

  webpackWatcher = webpack(config).watch(
    {
      aggregateTimeout: 300,
      ignored: ['**/node_modules/**', '**/build/**', '**/dist/**', '**/.git/**'],
    },
    (err, stats) => {
      if (err) {
        Logger.error('Webpack fatal error', err);
        return;
      }

      if (!stats) {
        Logger.error('No stats returned from webpack');
        return;
      }

      const info = stats.toJson();

      // Handle errors
      if (stats.hasErrors()) {
        info.errors?.forEach((error) => {
          Logger.error('Build error', error);
        });
        return;
      }

      // Handle warnings
      if (stats.hasWarnings()) {
        info.warnings?.forEach((warning) => {
          Logger.warn(warning.message || JSON.stringify(warning));
        });
      }

      // Get list of changed files
      const changedFiles =
        info.chunks
          ?.filter((chunk) => chunk.modules?.some((module) => module.moduleType === 'javascript/auto'))
          .flatMap((chunk) => chunk.modules?.map((module) => module.nameForCondition || '') || [])
          .filter((name) => name) || [];

      // Log successful build
      Logger.success(`Build completed in ${info.time}ms`);

      // Only notify clients if auto reload is enabled
      if (options.reload) {
        notifyClientsToReload(changedFiles, entries);
      }

      // Only log asset sizes in verbose mode
      if (options.verbose) {
        info.assets?.forEach((asset) => {
          Logger.info(`Asset: ${asset.name} (${formatBytes(asset.size)})`);
        });
      }
    },
  );

  // Force exit after timeout if graceful shutdown fails
  let forceExit = false;

  process.on('SIGINT', () => {
    if (forceExit) {
      Logger.info('Force exiting...');
      process.exit(1);
    }

    forceExit = true;
    Logger.info('Shutting down dev server...');

    // Force exit after 3 seconds if graceful shutdown fails
    setTimeout(() => {
      Logger.warn('Could not gracefully shut down within timeout, forcing exit...');
      process.exit(1);
    }, 3000);

    Promise.all([
      new Promise<void>((resolve) => {
        if (wss) {
          wss.close(() => {
            Logger.info('WebSocket server closed');
            resolve();
          });
        } else {
          resolve();
        }
      }),
      new Promise<void>((resolve) => {
        if (webpackWatcher) {
          webpackWatcher.close(() => {
            Logger.info('Webpack watcher closed');
            resolve();
          });
        } else {
          resolve();
        }
      }),
    ]).then(() => {
      Logger.info('Clean shutdown completed');
      process.exit(0);
    });
  });
}

// Utility function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
