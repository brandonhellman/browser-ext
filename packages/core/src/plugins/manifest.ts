import type { Plugin } from 'vite';
import fs from 'fs-extra';
import { paths } from '../utils/paths.js';
import Logger from '../utils/logger.js';

/**
 * Replace file extensions from TS/TSX to JS
 */
function replaceFileExtension(filePath: string): string {
  return filePath.replace(/\.(jsx?|tsx?)$/, '.js');
}

/**
 * Process manifest.json with smart defaults
 */
function processManifest(manifestContent: any, isDevelopment: boolean): any {
  const manifest = { ...manifestContent };
  
  // Read package.json for defaults
  let packageJson: any = {};
  if (fs.existsSync(paths.packageJson)) {
    packageJson = fs.readJSONSync(paths.packageJson);
  }

  // Apply smart defaults from package.json
  if (!manifest.name && packageJson.name) {
    manifest.name = packageJson.name;
    Logger.debug('Using name from package.json:', manifest.name);
  }

  if (!manifest.version && packageJson.version) {
    manifest.version = packageJson.version;
    Logger.debug('Using version from package.json:', manifest.version);
  }

  if (!manifest.description && packageJson.description) {
    manifest.description = packageJson.description;
    Logger.debug('Using description from package.json:', manifest.description);
  }

  // Replace file extensions in background.service_worker
  if (manifest.background?.service_worker) {
    manifest.background.service_worker = replaceFileExtension(
      manifest.background.service_worker
    );
  }

  // Replace file extensions in content_scripts
  if (manifest.content_scripts) {
    manifest.content_scripts = manifest.content_scripts.map((contentScript: any) => {
      if (contentScript.js) {
        contentScript.js = contentScript.js.map(replaceFileExtension);
      }
      if (contentScript.css) {
        contentScript.css = contentScript.css.map(replaceFileExtension);
      }
      return contentScript;
    });
  }

  // Replace file extensions in web_accessible_resources
  if (manifest.web_accessible_resources) {
    manifest.web_accessible_resources = manifest.web_accessible_resources.map((resource: any) => {
      if (resource.resources) {
        resource.resources = resource.resources.map((res: string) => {
          // Only replace JS/TS extensions, not other file types
          if (/\.(jsx?|tsx?)$/.test(res)) {
            return replaceFileExtension(res);
          }
          return res;
        });
      }
      return resource;
    });
  }

  // Replace file extensions in action (manifest v3) or browser_action/page_action (v2)
  const actionKeys = ['action', 'browser_action', 'page_action'];
  actionKeys.forEach(key => {
    if (manifest[key]?.default_popup) {
      manifest[key].default_popup = manifest[key].default_popup.replace(/\.(jsx?|tsx?)$/, '.html');
    }
  });

  // Add development-specific modifications
  if (isDevelopment) {
    // Add a timestamp for hot reload detection
    manifest.__dev_timestamp = Date.now();
  }

  return manifest;
}

/**
 * Vite plugin for intelligent manifest processing
 */
export function browserExtManifestPlugin(): Plugin {
  let manifestContent: any;
  let isDevelopment = false;

  return {
    name: 'browser-ext:manifest',
    
    configResolved(config) {
      isDevelopment = config.mode === 'development';
    },

    buildStart() {
      // Read and process manifest at build start
      if (!fs.existsSync(paths.manifestJson)) {
        throw new Error('No manifest.json found in project root');
      }

      const rawManifest = fs.readJSONSync(paths.manifestJson);
      manifestContent = processManifest(rawManifest, isDevelopment);
      
      Logger.info('Processed manifest.json');
    },

    generateBundle() {
      if (!manifestContent) {
        throw new Error('Manifest content not loaded');
      }

      // Emit the processed manifest
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.json',
        source: JSON.stringify(manifestContent, null, 2),
      });
    },

    // Watch manifest.json for changes
    watchChange(id) {
      if (id === paths.manifestJson) {
        Logger.info('Manifest.json changed, reprocessing...');
        const rawManifest = fs.readJSONSync(paths.manifestJson);
        manifestContent = processManifest(rawManifest, isDevelopment);
      }
    },
  };
}