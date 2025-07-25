import type { UserConfig } from 'vite';
import { paths } from '../utils/paths.js';

/**
 * Create base Vite configuration for browser extensions
 */
export function createViteConfig(userConfig: UserConfig = {}): UserConfig {
  const isDevelopment = process.env.NODE_ENV === 'development';

  const baseConfig: UserConfig = {
    root: paths.root,
    
    build: {
      outDir: paths.chromeDev,
      emptyOutDir: true,
      sourcemap: isDevelopment ? 'inline' : false,
      minify: !isDevelopment,
      reportCompressedSize: false,
      modulePreload: false,
      
      rollupOptions: {
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: 'chunks/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            // Keep folder structure for assets
            const info = assetInfo.name?.split('/') || [];
            if (info.length > 1) {
              return '[name].[ext]';
            }
            return 'assets/[name].[ext]';
          },
        },
      },
    },

    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    },

    optimizeDeps: {
      // Exclude Chrome API types from optimization
      exclude: ['@types/chrome'],
    },

    server: {
      port: 5173,
      open: false,
      hmr: true,
    },

    // Suppress Vite's default index.html handling
    appType: 'custom',
  };

  // Merge with user config
  return mergeConfig(baseConfig, userConfig);
}

/**
 * Deep merge Vite configs
 */
function mergeConfig(base: UserConfig, override: UserConfig): UserConfig {
  const merged = { ...base };

  for (const key in override) {
    const overrideValue = override[key as keyof UserConfig];
    const baseValue = base[key as keyof UserConfig];

    if (key === 'plugins') {
      // Plugins are handled separately in defineConfig
      continue;
    }

    if (isObject(baseValue) && isObject(overrideValue)) {
      merged[key as keyof UserConfig] = mergeConfig(
        baseValue as UserConfig,
        overrideValue as UserConfig
      ) as any;
    } else {
      merged[key as keyof UserConfig] = overrideValue as any;
    }
  }

  return merged;
}

function isObject(item: any): item is Record<string, any> {
  return item && typeof item === 'object' && !Array.isArray(item);
}