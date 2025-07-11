#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { confirm, select } from '@inquirer/prompts';
import { Command } from 'commander';
import fetch from 'node-fetch';

const program = new Command();

// Available examples
const examples = ['with-all', 'with-supabase', 'with-tailwind'] as const;
type Example = (typeof examples)[number];

interface TreeItem {
  path: string;
  type: string;
  url?: string;
  sha?: string;
}

/**
 * Gets the tree of files from GitHub repository
 */
async function getRepositoryTree(example: string): Promise<TreeItem[]> {
  const url = `https://api.github.com/repos/brandonhellman/browser-ext/git/trees/main?recursive=1`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch repository tree');
  }

  const data = (await response.json()) as { tree: TreeItem[] };
  return data.tree.filter((item) => item.type === 'blob' && item.path.startsWith(`examples/${example}/`));
}

/**
 * Downloads a file from GitHub repository
 */
async function downloadFile(filePath: string, destPath: string) {
  const url = `https://raw.githubusercontent.com/brandonhellman/browser-ext/main/${filePath}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to download ${filePath}`);
    }

    // Ensure the directory exists
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write the file
    const content = await response.text();
    fs.writeFileSync(destPath, content);
  } catch (error) {
    console.error(`Error downloading ${filePath}:`, error);
    throw error;
  }
}

/**
 * Downloads all files for an example
 */
async function downloadExample(example: Example, targetDir: string) {
  console.log(`Creating a new browser extension from ${example} example...`);

  try {
    // Get the tree of files
    const files = await getRepositoryTree(example);

    // Download each file
    for (const file of files) {
      const relativePath = file.path.replace(`examples/${example}/`, '');
      const destPath = path.join(targetDir, relativePath);
      await downloadFile(file.path, destPath);
      console.log(`Downloaded ${relativePath}`);
    }

    console.log('\nSuccess! Created browser extension from', example);
    console.log('\nInside that directory, you can run several commands:');
    console.log('\n  yarn install');
    console.log('    Install the dependencies');
    console.log('\n  yarn dev');
    console.log('    Starts the development server');
    console.log('\n  yarn build');
    console.log('    Builds the extension for production\n');
  } catch (error) {
    console.error('\nFailed to create browser extension:', error);
    process.exit(1);
  }
}

async function main() {
  program
    .name('create-browser-ext')
    .description('Create a new browser extension')
    .option('-w, --with <example>', 'Create project from example')
    .argument('[directory]', 'Directory to create the project in', '.')
    .parse(process.argv);

  const options = program.opts();
  const targetDir = program.args[0] || '.';

  // If example is provided via --with flag
  if (options.with) {
    if (!examples.includes(options.with)) {
      console.error(`Error: Example '${options.with}' not found. Available examples: ${examples.join(', ')}`);
      process.exit(1);
    }

    await downloadExample(options.with, targetDir);
    return;
  }

  // Interactive mode
  const useExample = await confirm({
    message: 'Would you like to use an example?',
  });

  if (!useExample) {
    console.error('Not implemented yet');
    process.exit(1);
  }

  const selectedExample = await select<Example>({
    message: 'Select an example to use:',
    choices: examples.map((example) => ({
      name: example,
      value: example,
      description: `Create project from ${example} example`,
    })),
  });

  await downloadExample(selectedExample, targetDir);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
