#!/usr/bin/env node

/**
 * This script uploads the build output directly to Cloudflare Pages
 * using the Direct Upload API, bypassing Cloudflare's build process.
 * 
 * Prerequisites:
 * 1. You need to have a Cloudflare API token with Pages permissions
 * 2. You need to have the account ID and project name
 * 
 * Usage:
 * CLOUDFLARE_API_TOKEN=your_token CLOUDFLARE_ACCOUNT_ID=your_account_id PROJECT_NAME=your_project node scripts/direct-upload.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const PROJECT_NAME = process.env.PROJECT_NAME || 'bolt';
const BUILD_DIR = path.join(process.cwd(), 'build/client');

// Validate environment variables
if (!CLOUDFLARE_API_TOKEN) {
  console.error('❌ CLOUDFLARE_API_TOKEN environment variable is required');
  process.exit(1);
}

if (!CLOUDFLARE_ACCOUNT_ID) {
  console.error('❌ CLOUDFLARE_ACCOUNT_ID environment variable is required');
  process.exit(1);
}

// Check if build directory exists
if (!fs.existsSync(BUILD_DIR)) {
  console.error(`❌ Build directory not found: ${BUILD_DIR}`);
  console.log('Run the build command first: pnpm run build:split');
  process.exit(1);
}

console.log('🚀 Starting direct upload to Cloudflare Pages...');

// Step 1: Build the project if it doesn't exist
if (!fs.existsSync(path.join(BUILD_DIR, 'index.html'))) {
  console.log('🔨 Build output not found, running build:split...');
  try {
    execSync('pnpm run build:split', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Step 2: Create a deployment using the Cloudflare API
console.log('📦 Creating deployment...');
let deploymentId;
try {
  const createDeploymentCommand = `
    curl -X POST "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${PROJECT_NAME}/deployments" \\
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \\
    -H "Content-Type: application/json" \\
    --data '{"production":{"enabled":true}}'
  `;
  
  const response = execSync(createDeploymentCommand).toString();
  const parsedResponse = JSON.parse(response);
  
  if (!parsedResponse.success) {
    console.error('❌ Failed to create deployment:', parsedResponse.errors);
    process.exit(1);
  }
  
  deploymentId = parsedResponse.result.id;
  console.log(`✅ Deployment created with ID: ${deploymentId}`);
} catch (error) {
  console.error('❌ Failed to create deployment:', error.message);
  process.exit(1);
}

// Step 3: Upload files
console.log('📤 Uploading files...');
try {
  // Get all files recursively
  const getAllFiles = (dir) => {
    const files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...getAllFiles(fullPath));
      } else {
        files.push(fullPath);
      }
    }
    
    return files;
  };
  
  const files = getAllFiles(BUILD_DIR);
  console.log(`Found ${files.length} files to upload`);
  
  // Upload each file
  for (const [index, file] of files.entries()) {
    const relativePath = path.relative(BUILD_DIR, file);
    const mimeType = getMimeType(file);
    
    console.log(`[${index + 1}/${files.length}] Uploading ${relativePath}`);
    
    const uploadCommand = `
      curl -X POST "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${PROJECT_NAME}/deployments/${deploymentId}/files/${encodeURIComponent(relativePath)}" \\
      -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \\
      -H "Content-Type: ${mimeType}" \\
      --data-binary @${file}
    `;
    
    execSync(uploadCommand, { stdio: 'ignore' });
  }
  
  console.log('✅ All files uploaded successfully');
} catch (error) {
  console.error('❌ Failed to upload files:', error.message);
  process.exit(1);
}

// Step 4: Complete the deployment
console.log('🏁 Completing deployment...');
try {
  const completeDeploymentCommand = `
    curl -X POST "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${PROJECT_NAME}/deployments/${deploymentId}/phases/deployment_complete" \\
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \\
    -H "Content-Type: application/json" \\
    --data '{}'
  `;
  
  execSync(completeDeploymentCommand, { stdio: 'ignore' });
  console.log('✅ Deployment completed successfully');
  
  // Get deployment URL
  const getDeploymentCommand = `
    curl "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${PROJECT_NAME}/deployments/${deploymentId}" \\
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}"
  `;
  
  const response = execSync(getDeploymentCommand).toString();
  const parsedResponse = JSON.parse(response);
  
  if (parsedResponse.success) {
    const url = parsedResponse.result.url;
    console.log(`🌐 Deployment URL: ${url}`);
  }
} catch (error) {
  console.error('❌ Failed to complete deployment:', error.message);
  process.exit(1);
}

console.log('✨ Direct upload to Cloudflare Pages completed successfully!');

// Helper function to get MIME type based on file extension
function getMimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain',
    '.xml': 'application/xml',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'font/otf',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
}
