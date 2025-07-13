#!/usr/bin/env node
import { program } from 'commander';

import { name, version } from '../package.json';
import { build } from './scripts/build';
import { buildAndZip } from './scripts/buildAndZip';
import { dev } from './scripts/dev';
import { zip } from './scripts/zip';
import Logger from './utils/logger';

// Setup the program
program.name(name).version(version, '-v, --version').usage('<script> [option]');

// Add the build command
program
  .command('build')
  .description('Build the browser extension for production.')
  .action(async () => {
    await build();
  });

// Add the zip command
program
  .command('zip')
  .description('Create a zip file of the production build.')
  .action(async () => {
    await zip();
  });

// Add the build-and-zip command
program
  .command('build-and-zip')
  .description('Build the browser extension for production and create a zip file.')
  .action(async () => {
    await buildAndZip();
  });

// Add the start command
program
  .command('dev')
  .description('Start the browser extension in development mode.')
  .option('-p, --port <number>', 'Port to run the development server on', '10000')
  .option('-r, --reload <boolean>', 'Reload the extension when changes are made', 'true')
  .option('-v, --verbose <boolean>', 'Enable verbose logging including asset details', 'false')
  .action(async (options) => {
    const port = Number(options.port);
    const reload = options.reload === 'true';
    const verbose = options.verbose === 'true';

    Logger.info('options', options);

    await dev({
      port: port,
      reload: reload,
      verbose: verbose,
    });
  });

// Parse the arguments
program.parse(process.argv);
