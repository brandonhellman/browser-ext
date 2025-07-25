import path from 'node:path';

export const paths = {
  root: process.cwd(),
  manifestJson: path.join(process.cwd(), 'manifest.json'),
  packageJson: path.join(process.cwd(), 'package.json'),
  chromeDev: path.join(process.cwd(), 'dist'),
  chromeProd: path.join(process.cwd(), 'dist'),
  firefoxDev: path.join(process.cwd(), 'dist-firefox'),
  firefoxProd: path.join(process.cwd(), 'dist-firefox'),
  
  // Helper to resolve paths relative to project root
  resolve: (...segments: string[]) => path.join(process.cwd(), ...segments),
  
  // Helper to get relative path from root
  relative: (filePath: string) => path.relative(process.cwd(), filePath),
};