#!/usr/bin/env bun
import { $ } from 'bun';
import { watch } from 'fs';
import { spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(require('child_process').exec);
const isWatch = process.argv.includes('--watch');

async function buildExtension() {
  console.log('Building extension...');
  await Bun.build({
    entrypoints: ['./src/extension.ts'],
    outdir: './dist',
    target: 'node',
    format: 'esm',
    external: ['vscode'],
    sourcemap: 'external',
  });
}

async function buildWebview() {
  console.log('Building webview...');

  // First, process CSS with Tailwind
  try {
    await execAsync('npx tailwindcss -i ./src/webview/styles.css -o ./dist/styles.css --minify');
  } catch (error) {
    console.error('Tailwind build failed:', error);
    throw error;
  }

  // Then build the React app
  await Bun.build({
    entrypoints: ['./src/webview/main.tsx'],
    outdir: './dist',
    target: 'browser',
    format: 'iife',
    sourcemap: 'external',
  });
}

async function build() {
  await Promise.all([buildExtension(), buildWebview()]);
  console.log('Build complete!');
}

if (isWatch) {
  console.log('Watching for changes...');

  // Initial build
  await build();

  // Watch for changes
  watch('./src', { recursive: true }, async (event, filename) => {
    console.log(`File changed: ${filename}`);
    if (filename?.startsWith('webview')) {
      await buildWebview();
    } else {
      await buildExtension();
    }
  });
} else {
  await build();
}
