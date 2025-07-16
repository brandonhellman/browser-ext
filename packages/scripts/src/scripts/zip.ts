import path from 'path';
import archiver from 'archiver';
import fs from 'fs-extra';

import { pathToBrowserExt } from '../utils/pathToBrowserExt';

export function zip() {
  return new Promise<void>((resolve, reject) => {
    // Try to get version from manifest.json first
    let version: string;

    try {
      const manifestJson = fs.readJSONSync(pathToBrowserExt.manifestJson);

      if (manifestJson.version) {
        version = manifestJson.version;
      } else {
        // Fall back to package.json if manifest doesn't have version
        const packageJson = fs.readJSONSync(pathToBrowserExt.packageJson);
        version = packageJson.version;
      }
    } catch (err) {
      // If manifest.json doesn't exist or has issues, use package.json
      const packageJson = fs.readJSONSync(pathToBrowserExt.packageJson);
      version = packageJson.version;
    }

    const zipName = `chrome-prod-${version}.zip`;
    const output = fs.createWriteStream(path.join(pathToBrowserExt.build, zipName));
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Maximum compression
    });

    output.on('close', () => {
      console.log(`Zip file created successfully: ${zipName}`);
      console.log(`Total bytes: ${archive.pointer()}`);
      resolve();
    });

    archive.on('error', (err: Error) => {
      reject(err);
    });

    archive.pipe(output);

    // Add the production build directory to the zip
    archive.directory(pathToBrowserExt.chromeProd, false);

    archive.finalize();
  });
}
