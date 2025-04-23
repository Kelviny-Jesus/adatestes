#!/usr/bin/env node

/**
 * This script splits the build process into smaller steps to reduce memory usage:
 * 1. Clean up unnecessary files
 * 2. Build client with minimal settings
 * 3. Build server with minimal settings
 * 4. Combine the results
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

console.log('🚀 Starting split build process...');

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

// Set common environment variables
const commonEnv = {
  ...process.env,
  NODE_OPTIONS: `--max-old-space-size=${NODE_MEMORY}`,
  VITE_OPTIMIZE_MEMORY: 'true',
  VITE_DISABLE_SOURCEMAPS: 'true',
  VITE_REDUCE_BUNDLE_SIZE: 'true',
  VITE_SPLIT_BUILD: 'true'
};

// Step 2: Build client with minimal settings
console.log('🔨 Building client with minimal settings...');
try {
  // Create temporary build script for client
  const clientBuildScript = `
    import { defineConfig } from 'vite';
    import { vitePlugin as remix } from '@remix-run/dev';
    import UnoCSS from 'unocss/vite';
    import tsconfigPaths from 'vite-tsconfig-paths';
    
    export default defineConfig({
      build: {
        target: 'esnext',
        minify: 'esbuild',
        sourcemap: false,
        assetsInlineLimit: 4096,
        rollupOptions: {
          treeshake: {
            moduleSideEffects: false,
            propertyReadSideEffects: false,
            tryCatchDeoptimization: false
          },
          output: {
            manualChunks: (id) => {
              if (id.includes('node_modules')) return 'vendor';
              return undefined;
            }
          }
        }
      },
      plugins: [
        remix(),
        UnoCSS(),
        tsconfigPaths()
      ],
      optimizeDeps: {
        noDiscovery: true
      }
    });
  `;
  
  fs.writeFileSync(path.join(process.cwd(), 'vite.client.config.js'), clientBuildScript);
  
  // Build client
  execSync('VITE_CLIENT_ONLY=true npx remix vite:build --config vite.client.config.js', {
    stdio: 'inherit',
    env: commonEnv
  });
  
  console.log('✅ Client build completed successfully!');
} catch (error) {
  console.error('❌ Client build failed:', error.message);
  process.exit(1);
}

// Step 3: Build server with minimal settings
console.log('🔨 Building server with minimal settings...');
try {
  // Create temporary build script for server
  const serverBuildScript = `
    import { defineConfig } from 'vite';
    import { vitePlugin as remix } from '@remix-run/dev';
    import tsconfigPaths from 'vite-tsconfig-paths';
    
    export default defineConfig({
      build: {
        target: 'esnext',
        minify: 'esbuild',
        sourcemap: false,
        ssr: true,
        rollupOptions: {
          treeshake: {
            moduleSideEffects: false,
            propertyReadSideEffects: false,
            tryCatchDeoptimization: false
          }
        }
      },
      plugins: [
        remix(),
        tsconfigPaths()
      ],
      optimizeDeps: {
        noDiscovery: true
      }
    });
  `;
  
  fs.writeFileSync(path.join(process.cwd(), 'vite.server.config.js'), serverBuildScript);
  
  // Build server
  execSync('VITE_SERVER_ONLY=true npx remix vite:build --config vite.server.config.js', {
    stdio: 'inherit',
    env: commonEnv
  });
  
  console.log('✅ Server build completed successfully!');
} catch (error) {
  console.error('❌ Server build failed:', error.message);
  process.exit(1);
}

// Step 4: Clean up temporary files
console.log('🧹 Cleaning up temporary files...');
try {
  fs.unlinkSync(path.join(process.cwd(), 'vite.client.config.js'));
  fs.unlinkSync(path.join(process.cwd(), 'vite.server.config.js'));
} catch (error) {
  console.warn(`   ⚠️ Could not remove temporary files: ${error.message}`);
}

console.log('✅ Split build process completed successfully!');
