#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Vercel deployment for LastMile Next.js app...\n');

// Check if we're in the right directory
const nextjsPath = path.join(__dirname, 'lastmile-nextjs');
if (!fs.existsSync(nextjsPath)) {
  console.error('❌ lastmile-nextjs directory not found!');
  process.exit(1);
}

// Check if package.json exists
const packageJsonPath = path.join(nextjsPath, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ package.json not found in lastmile-nextjs directory!');
  process.exit(1);
}

try {
  // Step 1: Install dependencies
  console.log('📦 Installing dependencies...');
  process.chdir(nextjsPath);
  execSync('npm install', { stdio: 'inherit' });

  // Step 2: Run type check
  console.log('🔍 Running type check...');
  try {
    execSync('npm run type-check', { stdio: 'inherit' });
  } catch (error) {
    console.warn('⚠️  Type check failed, but continuing...');
  }

  // Step 3: Build the application
  console.log('🏗️  Building application...');
  execSync('npm run build', { stdio: 'inherit' });

  // Step 4: Deploy to Vercel
  console.log('🚀 Deploying to Vercel...');
  process.chdir('..');
  execSync('vercel --prod', { stdio: 'inherit' });

  console.log('\n✅ Deployment completed successfully!');
  console.log('🌐 Your app should be available at your Vercel URL');
  
} catch (error) {
  console.error('\n❌ Deployment failed:', error.message);
  process.exit(1);
}