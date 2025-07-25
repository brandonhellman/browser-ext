import type { Plugin } from 'vite';
import Logger from '../utils/logger.js';

/**
 * Inject hot reload code into background scripts
 */
const injectBackgroundReload = () => `
;(() => {
  const POLL_INTERVAL = 1000; // 1 second
  let lastTimestamp = null;
  
  // Poll manifest for changes
  const checkForUpdates = async () => {
    try {
      const manifest = chrome.runtime.getManifest();
      const currentTimestamp = manifest.__dev_timestamp;
      
      if (lastTimestamp === null) {
        lastTimestamp = currentTimestamp;
      } else if (currentTimestamp && currentTimestamp !== lastTimestamp) {
        console.log('[browser-ext] Reloading extension...');
        chrome.runtime.reload();
      }
    } catch (error) {
      console.error('[browser-ext] Error checking for updates:', error);
    }
  };
  
  // Start polling
  setInterval(checkForUpdates, POLL_INTERVAL);
  
  // Listen for reload messages from content scripts
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === '__BROWSER_EXT_RELOAD__') {
      console.log('[browser-ext] Reload requested by content script');
      chrome.runtime.reload();
    }
  });
  
  console.log('[browser-ext] Hot reload enabled (no WebSocket!)');
})();
`;

/**
 * Inject hot reload code into content scripts
 */
const injectContentReload = () => `
;(() => {
  // Content scripts can't access chrome.runtime.getManifest()
  // So we'll watch for DOM changes as a proxy for development changes
  let reloadTimer = null;
  
  // Function to trigger reload
  const requestReload = () => {
    console.log('[browser-ext] Requesting extension reload...');
    chrome.runtime.sendMessage({ type: '__BROWSER_EXT_RELOAD__' });
  };
  
  // Watch for specific development indicators
  // This is triggered when Vite HMR fails and does a full page reload
  window.addEventListener('beforeunload', () => {
    // If page is reloading in development, likely due to changes
    if (window.location.hostname === 'localhost') {
      requestReload();
    }
  });
  
  // Alternative: Listen for messages from the dev server
  // This can be implemented if needed for specific use cases
  
  console.log('[browser-ext] Content script hot reload enabled');
})();
`;

/**
 * Inject hot reload code into extension pages (popup, options, etc.)
 */
const injectExtensionPageReload = () => `
;(() => {
  // Extension pages can use chrome.runtime.reload() directly
  let lastTimestamp = null;
  
  const checkForUpdates = async () => {
    try {
      const manifest = await chrome.runtime.getManifest();
      const currentTimestamp = manifest.__dev_timestamp;
      
      if (lastTimestamp === null) {
        lastTimestamp = currentTimestamp;
      } else if (currentTimestamp && currentTimestamp !== lastTimestamp) {
        console.log('[browser-ext] Reloading extension page...');
        window.location.reload();
      }
    } catch (error) {
      console.error('[browser-ext] Error checking for updates:', error);
    }
  };
  
  // Check less frequently for extension pages
  setInterval(checkForUpdates, 2000);
  
  console.log('[browser-ext] Extension page hot reload enabled');
})();
`;

/**
 * Vite plugin for hot reload without WebSocket
 */
export function browserExtHotReloadPlugin(): Plugin {
  let entries: any;

  return {
    name: 'browser-ext:hot-reload',
    
    enforce: 'post',
    
    configResolved(config) {
      // Get entries from the entries plugin
      entries = (config as any).__browserExtEntries;
    },

    transform(code, id) {
      // Only inject in development mode
      if (process.env.NODE_ENV !== 'development') {
        return null;
      }

      // Normalize the file path for comparison
      const normalizedId = id.replace(/\\/g, '/');

      // Check if this is a background script
      if (entries?.background) {
        for (const [name, path] of Object.entries(entries.background)) {
          if (normalizedId.endsWith(path as string)) {
            Logger.debug(`Injecting hot reload into background script: ${name}`);
            return {
              code: code + '\n' + injectBackgroundReload(),
              map: null,
            };
          }
        }
      }

      // Check if this is a content script
      if (entries?.contentScript) {
        for (const [name, path] of Object.entries(entries.contentScript)) {
          if (normalizedId.endsWith(path as string)) {
            Logger.debug(`Injecting hot reload into content script: ${name}`);
            return {
              code: code + '\n' + injectContentReload(),
              map: null,
            };
          }
        }
      }

      // Check if this is an extension page script
      if (entries?.extensionPage) {
        for (const [name, path] of Object.entries(entries.extensionPage)) {
          if (normalizedId.endsWith(path as string)) {
            Logger.debug(`Injecting hot reload into extension page: ${name}`);
            return {
              code: code + '\n' + injectExtensionPageReload(),
              map: null,
            };
          }
        }
      }

      return null;
    },
    
    // Handle manifest timestamp updates
    handleHotUpdate({ file }) {
      // When any file changes, update the manifest timestamp
      if (file.endsWith('manifest.json')) {
        // Manifest changed, let the manifest plugin handle it
        return;
      }
      
      // For other file changes, we rely on the injected code to detect
      // the manifest timestamp change after rebuild
      Logger.debug(`File changed: ${file}`);
    },
  };
}