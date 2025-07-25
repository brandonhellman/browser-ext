import { program } from 'commander';
import { createServer, build as viteBuild } from 'vite';
import fs from 'fs-extra';
import path from 'node:path';
import archiver from 'archiver';
import { defineConfig } from '../index.js';
import { paths } from '../utils/paths.js';
import Logger from '../utils/logger.js';

// Get package.json for version - use a fallback approach
let packageJson = { version: '0.0.1' };
try {
  // Try to read from the dist directory structure
  const packagePath = new URL('../../package.json', import.meta.url);
  packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
} catch (error) {
  // Fallback version if package.json can't be found
  Logger.debug('Could not read package.json, using fallback version');
}

program
  .name('@browser-ext/core')
  .version(packageJson.version)
  .description('Vite-powered build system for browser extensions');

// Dev command
program
  .command('dev')
  .description('Start development server with hot reload')
  .option('-p, --port <number>', 'Port for dev server', '5173')
  .option('--no-reload', 'Disable hot reload')
  .action(async (options) => {
    try {
      process.env.NODE_ENV = 'development';
      
      Logger.info('Starting development server...');
      
      const config = defineConfig({
        hotReload: options.reload,
      });

      const server = await createServer({
        ...config,
        server: {
          ...config.server,
          port: parseInt(options.port, 10),
        },
      });

      await server.listen();
      
      const info = server.config.logger.info;
      server.config.logger.info = (msg, opts) => {
        // Filter out Vite's default messages
        if (!msg.includes('ready in') && !msg.includes('Local:')) {
          info(msg, opts);
        }
      };

      Logger.success(`Extension dev server running at http://localhost:${options.port}`);
      Logger.info(`Load unpacked extension from: ${paths.chromeDev}`);
      Logger.info('Watching for changes...');
    } catch (error) {
      Logger.error('Failed to start dev server:', error);
      process.exit(1);
    }
  });

// Build command
program
  .command('build')
  .description('Build extension for production')
  .action(async () => {
    try {
      process.env.NODE_ENV = 'production';
      
      Logger.info('Building extension for production...');
      
      const config = defineConfig({
        hotReload: false,
      });

      await viteBuild(config);
      
      Logger.success('Build completed successfully!');
      Logger.info(`Output directory: ${paths.chromeProd}`);
    } catch (error) {
      Logger.error('Build failed:', error);
      process.exit(1);
    }
  });

// Zip command
program
  .command('zip')
  .description('Create a zip file of the built extension')
  .action(async () => {
    try {
      const distPath = paths.chromeProd;
      
      if (!fs.existsSync(distPath)) {
        Logger.error('No build found. Run "browser-ext build" first.');
        process.exit(1);
      }

      // Read manifest to get version
      const manifestPath = path.join(distPath, 'manifest.json');
      const manifest = fs.readJSONSync(manifestPath);
      const version = manifest.version || '1.0.0';
      const name = manifest.name || 'extension';
      
      // Create zip filename
      const zipName = `${name.toLowerCase().replace(/\s+/g, '-')}-${version}.zip`;
      const zipPath = path.join(paths.root, zipName);

      Logger.info(`Creating ${zipName}...`);

      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        const size = (archive.pointer() / 1024).toFixed(2);
        Logger.success(`Created ${zipName} (${size} KB)`);
      });

      archive.on('error', (err) => {
        throw err;
      });

      archive.pipe(output);
      archive.directory(distPath, false);
      await archive.finalize();
    } catch (error) {
      Logger.error('Failed to create zip:', error);
      process.exit(1);
    }
  });

// Build and zip command
program
  .command('build-and-zip')
  .description('Build extension and create zip file')
  .action(async () => {
    try {
      // Run build
      await program.commands.find(cmd => cmd.name() === 'build')?.parseAsync(process.argv);
      
      // Run zip
      await program.commands.find(cmd => cmd.name() === 'zip')?.parseAsync(process.argv);
    } catch (error) {
      Logger.error('Build and zip failed:', error);
      process.exit(1);
    }
  });

// Parse arguments
program.parse(process.argv);