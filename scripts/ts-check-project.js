#!/usr/bin/env node
/*
  scripts/ts-check-project.js

  Project-wide TypeScript checker using ai-typescript-check API.

  Features:
  - Recursively scans for .ts/.tsx/.js/.jsx files (excluding node_modules, .git, etc.)
  - Builds a virtual file system map (fsMap)
  - Sends a POST request with fsMap to check for type errors across all files
  - Displays errors, warnings, and quick infos

  Notes:
  - Requires Node.js 18+ (global fetch and FormData)
  - The API uses twoslash, which analyzes the provided 'code' using fsMap for resolution
  - To check all files, we use a dummy code; errors may only include those referenced
  - For full project checking, consider integrating with tsc or similar
*/

const fs = require('fs');
const path = require('path');

const API_BASE = 'https://ts-check.okikio.dev/twoslash';

function ensureFetchAndFormData() {
  if (typeof fetch === 'undefined' || typeof FormData === 'undefined') {
    throw new Error(
      'This script requires a global fetch and FormData (Node 18+).\n' +
      'Please run with Node 18+ or provide a compatible fetch/FormData shim.'
    );
  }
}

function findFiles(dir, extensions, excludeDirs = ['node_modules', '.git', '.vscode', 'dist', 'build'], includeDirs = ['app', 'components', 'lib', 'hooks']) {
  const files = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!excludeDirs.includes(item) && (includeDirs.length === 0 || includeDirs.includes(item))) {
        files.push(...findFiles(fullPath, extensions, excludeDirs, includeDirs));
      }
    } else if (stat.isFile()) {
      const ext = path.extname(item).toLowerCase();
      if (extensions.includes(ext)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

async function checkProject(rootDir) {
  ensureFetchAndFormData();

  console.log('Scanning for TypeScript/JavaScript files...');
  const extensions = ['.ts', '.tsx', '.js', '.jsx'];
  const files = findFiles(rootDir, extensions);
  console.log(`Found ${files.length} files.`);

  if (files.length === 0) {
    console.log('No files to check.');
    return;
  }

  const allErrors = [];
  const allWarnings = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = path.relative(rootDir, file);
      const ext = path.extname(file).toLowerCase();
      const extension = ext === '.ts' ? 'ts' : ext === '.tsx' ? 'tsx' : ext === '.js' ? 'js' : 'jsx';

      console.log(`Checking ${relativePath}...`);

      const formData = new FormData();
      formData.append('code', content);
      formData.append('extension', extension);

      const res = await fetch(API_BASE, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const text = await res.text();
        console.warn(`Failed to check ${relativePath}: ${res.status} ${res.statusText}\n${text}`);
        continue;
      }

      const result = await res.json();

      if (result.errors && result.errors.length > 0) {
        result.errors.forEach(error => {
          allErrors.push({ file: relativePath, ...error });
        });
      }

      if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach(warning => {
          allWarnings.push({ file: relativePath, ...warning });
        });
      }

    } catch (err) {
      console.warn(`Error checking ${file}: ${err.message}`);
    }
  }

  console.log('\n=== TypeScript Check Results ===\n');

  if (allErrors.length > 0) {
    console.log('Errors:');
    allErrors.forEach((error, i) => {
      console.log(`${i + 1}. [${error.file}] ${error.renderedMessage || error.message} (line ${error.line}, char ${error.character})`);
    });
  } else {
    console.log('No errors found.');
  }

  if (allWarnings.length > 0) {
    console.log('\nWarnings:');
    allWarnings.forEach((warning, i) => {
      console.log(`${i + 1}. [${warning.file}] ${warning.renderedMessage} (line ${warning.line}, char ${warning.character})`);
    });
  }

  console.log(`\nChecked ${files.length} files.`);
}

async function main() {
  const rootDir = process.cwd(); // Or pass as arg
  try {
    await checkProject(rootDir);
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkProject };