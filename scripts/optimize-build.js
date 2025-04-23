#!/usr/bin/env node

/**
 * This script optimizes the build process by:
 * 1. Cleaning up unnecessary files before build
 * 2. Setting environment variables to optimize memory usage
 * 3. Providing a more memory-efficient build process
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const TEMP_DIRS_TO_CLEAN = [
  '.cache',
  'node_modules/.cache',
  'node_modules/.vite',
  'build',
  '.wrangler',
  'dist'
];

const NODE_MEMORY = 8192; // MB - Increased to 8GB

console.log('🚀 Starting build optimization...');

// Step 1: Clean temporary directories
console.log('🧹 Cleaning temporary directories...');
TEMP_DIRS_TO_CLEAN.forEach(dir => {
  const dirPath = path.join(process.cwd(), dir);
  if (fs.existsSync(dirPath)) {
    console.log(`   Removing ${dir}...`);
    try {
      if (process.platform === 'win32') {
        execSync(`rmdir /s /q "${dirPath}"`, { stdio: 'ignore' });
      } else {
        execSync(`rm -rf "${dirPath}"`, { stdio: 'ignore' });
      }
    } catch (error) {
      console.warn(`   ⚠️ Could not remove ${dir}: ${error.message}`);
    }
  }
});

// Step 2: Set environment variables for optimized build
console.log('⚙️ Setting environment variables for optimized build...');
process.env.NODE_OPTIONS = `--max-old-space-size=${NODE_MEMORY}`;
process.env.VITE_OPTIMIZE_MEMORY = 'true';

// Step 3: Run the build command with optimized settings
console.log(`🔨 Running build with ${NODE_MEMORY}MB memory limit...`);
try {
  // Use execSync to run the build command
  execSync('pnpm run build', { 
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_OPTIONS: `--max-old-space-size=${NODE_MEMORY}`,
      VITE_OPTIMIZE_MEMORY: 'true'
    }
  });
  console.log('✅ Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
