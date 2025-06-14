import webpack from 'webpack';

import { getConfig } from '../webpack/getConfig';
import { getEntries } from '../webpack/getEntries';

export function build() {
  return new Promise<void>((resolve, reject) => {
    console.log('Running build...');

    // Get all entry points from manifest and HTML files
    const entries = getEntries();

    // Create webpack config in production mode
    const config = getConfig({
      entry: entries,
      mode: 'production',
    });

    // Create webpack compiler
    const compiler = webpack(config);

    // Run the compiler
    compiler.run((err, stats) => {
      if (err) {
        console.error('Build failed:', err);
        reject(err);
        return;
      }

      if (stats?.hasErrors()) {
        console.error(
          'Build failed with errors:',
          stats.toString({
            colors: true,
            errorDetails: true,
          }),
        );
        reject(new Error('Build failed with errors'));
        return;
      }

      // Log success and stats
      console.log(
        stats?.toString({
          colors: true,
          modules: false,
          children: false,
          chunks: false,
          chunkModules: false,
        }),
      );

      // Close the compiler
      compiler.close((closeErr) => {
        if (closeErr) {
          console.error('Error closing compiler:', closeErr);
          reject(closeErr);
          return;
        }
        resolve();
      });
    });
  });
}
