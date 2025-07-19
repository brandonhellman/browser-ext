import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import webpack from 'webpack';

import { pathToBrowserExt } from '../utils/pathToBrowserExt';
import { CopyCssManifestPlugin } from './plugins/CopyCssManifestPlugin';
import { CopyHtmlPlugin } from './plugins/CopyHtmlPlugin';
import { CopyLocalesPlugin } from './plugins/CopyLocalesPlugin';
import { CopyManifestPlugin } from './plugins/CopyManifestPlugin';
import { CopyPngHtmlPlugin } from './plugins/CopyPngHtmlPlugin';
import { CopyPngManifestPlugin } from './plugins/CopyPngManifestPlugin';
import { CopyWebAccessibleResourcesPlugin } from './plugins/CopyWebAccessibleResourcesPlugin';
import { ReloadBackgroundPlugin } from './plugins/ReloadBackgroundPlugin';
import { ReloadContentPlugin } from './plugins/ReloadContentPlugin';
import { ReloadPagePlugin } from './plugins/ReloadPagePlugin';

interface ConfigOptions {
  entry: {
    background: webpack.EntryObject;
    contentScript: webpack.EntryObject;
    extensionPage: webpack.EntryObject;
  };
}

interface ConfigOptionsDevelopment extends ConfigOptions {
  mode: 'development';
  port: number;
  reload: boolean;
}

interface ConfigOptionsProduction extends ConfigOptions {
  mode: 'production';
}

export function getConfig(options: ConfigOptionsDevelopment | ConfigOptionsProduction): webpack.Configuration {
  // Load .env files
  const envFiles = ['.env.local', `.env.${options.mode}`, '.env'];

  // Load environment variables from files
  envFiles.forEach((envFile) => {
    const envPath = path.resolve(process.cwd(), envFile);
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }
  });

  // Filter environment variables - only pass those prefixed with BROWSER_EXT_
  const envVars: Record<string, string> = {};
  Object.keys(process.env).forEach((key) => {
    if (key.startsWith('BROWSER_EXT_')) {
      envVars[key] = process.env[key] || '';
    }
  });

  // Also include NODE_ENV
  envVars.NODE_ENV = options.mode;

  const isDevelopment = options.mode === 'development';
  const isProduction = options.mode === 'production';

  const config: webpack.Configuration = {
    mode: options.mode,

    entry: {
      ...options.entry.background,
      ...options.entry.contentScript,
      ...options.entry.extensionPage,
    },

    module: {
      rules: [
        {
          // Handle TypeScript and React files
          test: /\.(ts|tsx)$/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                '@babel/preset-env',
                '@babel/preset-typescript',
                ['@babel/preset-react', { runtime: 'automatic' }],
              ],
              // Enable caching for faster rebuilds
              cacheDirectory: true,
            },
          },
          exclude: /node_modules/,
        },
        {
          // Handle CSS files
          test: /\.css$/,
          use: [
            'style-loader', // Injects CSS into the DOM
            'css-loader', // Handles CSS imports
            'postcss-loader', // Process PostCSS (including Tailwind)
          ],
        },
        {
          // Handle SVG files as React components
          test: /\.svg$/,
          use: ['@svgr/webpack'],
        },
      ],
    },

    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.css'],
    },

    output: {
      clean: true, // Clean the output directory before emit
      filename: '[name].js',
      chunkFilename: '[name].chunk.js',
    },

    optimization: {
      splitChunks: {
        chunks: 'all',
        name: 'vendor',
        minSize: 999999999, // Don't split chunks
        // minSize: isDevelopment ? 999999999 : 20000, // Don't split chunks in development for faster builds
      },
    },

    performance: {
      hints: isProduction ? 'warning' : false,
    },
  };

  const basePlugins = [
    new webpack.DefinePlugin(
      Object.keys(envVars).reduce(
        (acc, key) => {
          acc[`process.env.${key}`] = JSON.stringify(envVars[key]);
          return acc;
        },
        {} as Record<string, string>,
      ),
    ),
    CopyManifestPlugin(isDevelopment),
    CopyCssManifestPlugin(isDevelopment),
    CopyHtmlPlugin(isDevelopment),
    CopyLocalesPlugin(isDevelopment),
    CopyPngManifestPlugin(isDevelopment),
    CopyPngHtmlPlugin(isDevelopment),
    CopyWebAccessibleResourcesPlugin(isDevelopment),
  ];

  if (isDevelopment) {
    // Only add reload plugins if auto reload is enabled
    const reloadPlugins = options.reload
      ? [
          ReloadBackgroundPlugin({ entry: options.entry.background, port: options.port }),
          ReloadContentPlugin({ entry: options.entry.contentScript, port: options.port }),
          ReloadPagePlugin({ entry: options.entry.extensionPage, port: options.port }),
        ]
      : [];

    return {
      ...config,

      cache: {
        type: 'filesystem',
      },

      devtool: 'inline-source-map',

      output: {
        ...config.output,
        path: pathToBrowserExt.chromeDev,
      },

      plugins: [...basePlugins, ...reloadPlugins].filter(Boolean),

      stats: 'errors-warnings',
    };
  }

  if (isProduction) {
    return {
      ...config,

      // devtool: 'source-map', // Generates separate source maps
      devtool: 'inline-source-map',

      optimization: {
        ...config.optimization,
        // minimize: true,
        // moduleIds: 'deterministic',
      },

      output: {
        ...config.output,
        path: pathToBrowserExt.chromeProd,
      },

      plugins: [...basePlugins].filter(Boolean),
    };
  }

  throw new Error('Invalid mode');
}
