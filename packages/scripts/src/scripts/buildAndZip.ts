import { build } from './build';
import { zip } from './zip';

export async function buildAndZip() {
  console.log('Building and creating zip...');

  // First build the extension
  await build();

  // Then create the zip file
  await zip();
}
