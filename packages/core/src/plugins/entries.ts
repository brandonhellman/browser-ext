import type { Plugin } from 'vite';
import path from 'node:path';
import fs from 'fs-extra';
import { glob } from 'glob';
import { JSDOM } from 'jsdom';
import { paths } from '../utils/paths.js';
import Logger from '../utils/logger.js';

interface EntryMap {
  [key: string]: string;
}

interface EntriesResult {
  background: EntryMap;
  contentScript: EntryMap;
  extensionPage: EntryMap;
}

/**
 * Get entry configuration from a file path
 */
function getEntry(entryPath: string) {
  const relativePath = paths.relative(entryPath);
  const parsedPath = path.parse(relativePath);
  const name = relativePath.replace(parsedPath.ext, '');

  return {
    name: name.replace(/\\/g, '/'), // Normalize path separators
    path: './' + relativePath.replace(/\\/g, '/'),
  };
}

/**
 * Get entries for background scripts from manifest
 */
function getBackgroundEntries(manifestJson: any): EntryMap {
  const entries: EntryMap = {};
  const serviceWorker = manifestJson.background?.service_worker;

  if (serviceWorker) {
    const entry = getEntry(serviceWorker);
    entries[entry.name] = entry.path;
    Logger.debug('Found background script:', entry.name);
  }

  return entries;
}

/**
 * Get entries for content scripts from manifest
 */
function getContentScriptEntries(manifestJson: any): EntryMap {
  const entries: EntryMap = {};
  const contentScripts = manifestJson.content_scripts;

  if (contentScripts) {
    contentScripts.forEach((contentScript: { js?: string[] }) => {
      if (contentScript.js) {
        contentScript.js.forEach((js: string) => {
          const entry = getEntry(js);
          entries[entry.name] = entry.path;
          Logger.debug('Found content script:', entry.name);
        });
      }
    });
  }

  return entries;
}

/**
 * Get entries from HTML files by parsing script tags
 */
function getExtensionPageEntries(): EntryMap {
  const entries: EntryMap = {};

  const htmlFiles = glob.sync('**/*.html', {
    cwd: paths.root,
    ignore: ['node_modules/**/*', 'dist/**/*', 'build/**/*'],
  });

  htmlFiles.forEach((htmlFile) => {
    const htmlPath = path.join(paths.root, htmlFile);
    const dirname = path.dirname(htmlPath);
    const content = fs.readFileSync(htmlPath, 'utf-8');
    const dom = new JSDOM(content);

    dom.window.document.querySelectorAll('script[src]').forEach((script) => {
      const src = script.getAttribute('src');
      if (src && !src.startsWith('http')) {
        const scriptPath = path.join(dirname, src);
        const entry = getEntry(scriptPath);
        entries[entry.name] = entry.path;
        Logger.debug('Found script in HTML:', entry.name);
      }
    });
  });

  return entries;
}

/**
 * Discover all entry points from manifest and HTML files
 */
export function discoverEntries(): EntriesResult {
  if (!fs.existsSync(paths.manifestJson)) {
    throw new Error('No manifest.json found in project root');
  }

  const manifestJson = fs.readJSONSync(paths.manifestJson);

  const backgroundEntries = getBackgroundEntries(manifestJson);
  const contentScriptEntries = getContentScriptEntries(manifestJson);
  const extensionPageEntries = getExtensionPageEntries();

  Logger.info('Discovered entries:', {
    background: Object.keys(backgroundEntries).length,
    contentScript: Object.keys(contentScriptEntries).length,
    extensionPage: Object.keys(extensionPageEntries).length,
  });

  return {
    background: backgroundEntries,
    contentScript: contentScriptEntries,
    extensionPage: extensionPageEntries,
  };
}

/**
 * Vite plugin for automatic entry discovery
 */
export function browserExtEntriesPlugin(): Plugin {
  let entries: EntriesResult;

  return {
    name: 'browser-ext:entries',
    
    config() {
      // Discover entries when config is resolved
      entries = discoverEntries();
      
      // Combine all entries into a single input object
      const input = {
        ...entries.background,
        ...entries.contentScript,
        ...entries.extensionPage,
      };

      if (Object.keys(input).length === 0) {
        Logger.warn('No entry points found. Make sure your manifest.json is configured correctly.');
      }

      return {
        build: {
          rollupOptions: {
            input,
            output: {
              entryFileNames: '[name].js',
              chunkFileNames: '[name]-[hash].js',
              assetFileNames: '[name].[ext]',
            },
          },
        },
      };
    },
    
    // Store entries for use by other plugins
    configResolved(config) {
      // Make entries available to other plugins via config
      (config as any).__browserExtEntries = entries;
    },
  };
}