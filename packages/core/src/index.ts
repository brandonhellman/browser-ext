import type { Plugin, UserConfig } from 'vite';
import { browserExtEntriesPlugin } from './plugins/entries.js';
import { browserExtManifestPlugin } from './plugins/manifest.js';
import { browserExtAssetsPlugin } from './plugins/assets.js';
import { browserExtHotReloadPlugin } from './plugins/hot-reload.js';
import { browserExtTypeInferencePlugin } from './plugins/type-inference.js';
import { createViteConfig } from './config/vite.js';

// Re-export plugins for advanced users
export {
  browserExtEntriesPlugin,
  browserExtManifestPlugin,
  browserExtAssetsPlugin,
  browserExtHotReloadPlugin,
  browserExtTypeInferencePlugin,
};

// Re-export utilities
export { Logger } from './utils/logger.js';
export { paths } from './utils/paths.js';

// Main config function for users
export interface BrowserExtConfig {
  /**
   * Enable type inference for chrome.runtime.sendMessage and storage
   * @default true
   */
  typeInference?: boolean;
  
  /**
   * Enable hot reload functionality
   * @default true
   */
  hotReload?: boolean;
  
  /**
   * Additional Vite config to merge
   */
  vite?: UserConfig;
  
  /**
   * Additional Vite plugins
   */
  plugins?: Plugin[];
}

/**
 * Define configuration for browser extension build
 */
export function defineConfig(config: BrowserExtConfig = {}): UserConfig {
  const {
    typeInference = true,
    hotReload = true,
    vite: userViteConfig = {},
    plugins: userPlugins = [],
  } = config;

  const plugins: Plugin[] = [
    browserExtEntriesPlugin(),
    browserExtManifestPlugin(),
    browserExtAssetsPlugin(),
  ];

  if (process.env.NODE_ENV === 'development' && hotReload) {
    plugins.push(browserExtHotReloadPlugin());
  }

  if (typeInference) {
    plugins.push(browserExtTypeInferencePlugin());
  }

  plugins.push(...userPlugins);

  return createViteConfig({
    ...userViteConfig,
    plugins: [...plugins, ...(userViteConfig.plugins || [])],
  });
}

// Default export for convenience
export default defineConfig;