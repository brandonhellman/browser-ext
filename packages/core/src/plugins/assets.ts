import type { Plugin } from 'vite';
import fs from 'fs-extra';
import path from 'node:path';
import { glob } from 'glob';
import { JSDOM } from 'jsdom';
import postcss from 'postcss';
import postcssrc from 'postcss-load-config';
import { paths } from '../utils/paths.js';
import Logger from '../utils/logger.js';

interface AssetsToCopy {
  css: string[];
  icons: string[];
  html: string[];
  locales: string[];
  webAccessibleResources: string[];
}

/**
 * Discover CSS files referenced in manifest
 */
function discoverCssFiles(manifest: any): string[] {
  const cssFiles: string[] = [];

  // Check content scripts
  if (manifest.content_scripts) {
    manifest.content_scripts.forEach((script: any) => {
      if (script.css) {
        cssFiles.push(...script.css);
      }
    });
  }

  return cssFiles;
}

/**
 * Discover icon files referenced in manifest
 */
function discoverIconFiles(manifest: any): string[] {
  const iconFiles: string[] = [];

  // Check icons object
  if (manifest.icons) {
    Object.values(manifest.icons).forEach((iconPath) => {
      if (typeof iconPath === 'string') {
        iconFiles.push(iconPath);
      }
    });
  }

  // Check action icons (manifest v3)
  if (manifest.action?.default_icon) {
    const icon = manifest.action.default_icon;
    if (typeof icon === 'string') {
      iconFiles.push(icon);
    } else if (typeof icon === 'object') {
      Object.values(icon).forEach((iconPath) => {
        if (typeof iconPath === 'string') {
          iconFiles.push(iconPath as string);
        }
      });
    }
  }

  // Check browser_action/page_action icons (manifest v2)
  ['browser_action', 'page_action'].forEach((key) => {
    if (manifest[key]?.default_icon) {
      const icon = manifest[key].default_icon;
      if (typeof icon === 'string') {
        iconFiles.push(icon);
      } else if (typeof icon === 'object') {
        Object.values(icon).forEach((iconPath) => {
          if (typeof iconPath === 'string') {
            iconFiles.push(iconPath as string);
          }
        });
      }
    }
  });

  return iconFiles;
}

/**
 * Discover HTML files (excluding those that are entry points)
 */
function discoverHtmlFiles(): string[] {
  const htmlFiles = glob.sync('**/*.html', {
    cwd: paths.root,
    ignore: ['node_modules/**/*', 'dist/**/*', 'build/**/*'],
  });

  // Process each HTML file to copy linked assets
  const processedHtmlFiles: string[] = [];
  
  htmlFiles.forEach((htmlFile) => {
    // Copy HTML files (they might have inline scripts or no scripts)
    processedHtmlFiles.push(htmlFile);
  });

  return processedHtmlFiles;
}

/**
 * Discover locale files
 */
function discoverLocaleFiles(): string[] {
  const localeFiles: string[] = [];
  const localesPath = path.join(paths.root, '_locales');

  if (fs.existsSync(localesPath)) {
    const files = glob.sync('**/*.json', {
      cwd: localesPath,
    });
    
    files.forEach((file) => {
      localeFiles.push(path.join('_locales', file));
    });
  }

  return localeFiles;
}

/**
 * Discover web accessible resources
 */
function discoverWebAccessibleResources(manifest: any): string[] {
  const resources: string[] = [];

  if (manifest.web_accessible_resources) {
    manifest.web_accessible_resources.forEach((resource: any) => {
      if (typeof resource === 'string') {
        // Manifest V2 format
        resources.push(resource);
      } else if (resource.resources) {
        // Manifest V3 format
        resources.push(...resource.resources);
      }
    });
  }

  return resources;
}

/**
 * Copy asset to output directory
 */
function copyAsset(from: string, to: string) {
  const sourcePath = path.join(paths.root, from);
  const destPath = path.join(paths.chromeDev, to);

  if (fs.existsSync(sourcePath)) {
    fs.ensureDirSync(path.dirname(destPath));
    fs.copyFileSync(sourcePath, destPath);
    Logger.debug(`Copied asset: ${from} → ${to}`);
  } else {
    Logger.warn(`Asset not found: ${from}`);
  }
}

/**
 * Process CSS file with PostCSS
 */
async function processCssFile(from: string, to: string) {
  const sourcePath = path.join(paths.root, from);
  const destPath = path.join(paths.chromeDev, to);

  if (!fs.existsSync(sourcePath)) {
    Logger.warn(`CSS file not found: ${from}`);
    return;
  }

  try {
    // Read CSS content
    const cssContent = fs.readFileSync(sourcePath, 'utf-8');
    
    // Try to load PostCSS config
    let result;
    try {
      const config = await postcssrc({}, paths.root);
      const processor = postcss(config.plugins);
      result = await processor.process(cssContent, {
        from: sourcePath,
        to: destPath,
        ...config.options,
      });
    } catch (configError) {
      // No PostCSS config found, just copy the file
      Logger.debug('No PostCSS config found, copying CSS as-is');
      result = { css: cssContent };
    }

    // Write processed CSS
    fs.ensureDirSync(path.dirname(destPath));
    fs.writeFileSync(destPath, result.css);
    
    if (result.map) {
      fs.writeFileSync(`${destPath}.map`, result.map.toString());
    }
    
    Logger.debug(`Processed CSS: ${from} → ${to}`);
  } catch (error) {
    Logger.error(`Error processing CSS ${from}:`, error);
    // Fall back to simple copy
    copyAsset(from, to);
  }
}

/**
 * Vite plugin for handling browser extension assets
 */
export function browserExtAssetsPlugin(): Plugin {
  let assets: AssetsToCopy;
  let manifest: any;

  return {
    name: 'browser-ext:assets',

    buildStart() {
      // Read manifest
      if (fs.existsSync(paths.manifestJson)) {
        manifest = fs.readJSONSync(paths.manifestJson);
      }

      // Discover all assets
      assets = {
        css: discoverCssFiles(manifest),
        icons: discoverIconFiles(manifest),
        html: discoverHtmlFiles(),
        locales: discoverLocaleFiles(),
        webAccessibleResources: discoverWebAccessibleResources(manifest),
      };

      Logger.info('Discovered assets:', {
        css: assets.css.length,
        icons: assets.icons.length,
        html: assets.html.length,
        locales: assets.locales.length,
        webAccessibleResources: assets.webAccessibleResources.length,
      });
    },

    // Handle HTML transformation
    transform(code, id) {
      if (id.endsWith('.html')) {
        // Process HTML files to update asset paths if needed
        const dom = new JSDOM(code);
        const doc = dom.window.document;

        // Update link tags for CSS
        doc.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
          const href = link.getAttribute('href');
          if (href && !href.startsWith('http')) {
            // Ensure correct path resolution
            link.setAttribute('href', href);
          }
        });

        return dom.serialize();
      }
      return null;
    },

    async generateBundle() {
      // Process CSS files with PostCSS
      await Promise.all(
        assets.css.map((cssFile) => processCssFile(cssFile, cssFile))
      );

      // Copy icon files
      assets.icons.forEach((iconFile) => {
        copyAsset(iconFile, iconFile);
      });

      // Copy HTML files
      assets.html.forEach((htmlFile) => {
        const sourcePath = path.join(paths.root, htmlFile);
        const destPath = path.join(paths.chromeDev, htmlFile);
        
        if (fs.existsSync(sourcePath)) {
          fs.ensureDirSync(path.dirname(destPath));
          
          // Process HTML to remove script tags that are now bundled
          let content = fs.readFileSync(sourcePath, 'utf-8');
          const dom = new JSDOM(content);
          
          // Update script src to use bundled versions
          dom.window.document.querySelectorAll('script[src]').forEach((script) => {
            const src = script.getAttribute('src');
            if (src && !src.startsWith('http')) {
              // Replace .ts/.tsx with .js
              const newSrc = src.replace(/\.(tsx?|jsx?)$/, '.js');
              script.setAttribute('src', newSrc);
            }
          });
          
          fs.writeFileSync(destPath, dom.serialize());
          Logger.debug(`Processed HTML: ${htmlFile}`);
        }
      });

      // Copy locale files
      assets.locales.forEach((localeFile) => {
        copyAsset(localeFile, localeFile);
      });

      // Copy web accessible resources (that aren't already handled)
      const allHandledFiles = [
        ...assets.css,
        ...assets.icons,
        ...assets.html,
        ...assets.locales,
      ];

      assets.webAccessibleResources.forEach((resource) => {
        if (!allHandledFiles.includes(resource)) {
          // Use glob to handle wildcards
          if (resource.includes('*')) {
            const files = glob.sync(resource, {
              cwd: paths.root,
              ignore: ['node_modules/**/*', 'dist/**/*'],
            });
            files.forEach((file) => copyAsset(file, file));
          } else {
            copyAsset(resource, resource);
          }
        }
      });
    },
  };
}