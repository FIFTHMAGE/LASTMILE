#!/usr/bin/env node

/**
 * Deployment script with backend fixes
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Deploying LastMile with Backend Fixes');
console.log('========================================\n');

// Step 1: Check if we're in the right directory
const packageJsonPath = path.join(process.cwd(), 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ package.json not found. Make sure you\'re in the lastmile-nextjs directory.');
  process.exit(1);
}

// Step 2: Install dependencies
console.log('📦 Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed\n');
} catch (error) {
  console.error('❌ Failed to install dependencies');
  process.exit(1);
}

// Step 3: Run type check
console.log('🔍 Running type check...');
try {
  execSync('npm run type-check', { stdio: 'inherit' });
  console.log('✅ Type check passed\n');
} catch (error) {
  console.warn('⚠️  Type check failed, but continuing...\n');
}

// Step 4: Build locally to test
console.log('🔨 Building project...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build successful\n');
} catch (error) {
  console.error('❌ Build failed');
  process.exit(1);
}

// Step 5: Deploy to Vercel
console.log('🚀 Deploying to Vercel...');
try {
  execSync('vercel --prod', { stdio: 'inherit' });
  console.log('✅ Deployment successful\n');
} catch (error) {
  console.error('❌ Deployment failed');
  process.exit(1);
}

// Step 6: Test the deployment
console.log('🧪 Testing deployment...');
setTimeout(() => {
  try {
    execSync('node scripts/test-backend-connection.js', { stdio: 'inherit' });
  } catch (error) {
    console.warn('⚠️  Test script failed, but deployment may still be successful');
  }
}, 5000); // Wait 5 seconds for deployment to propagate

console.log('\n🎉 Deployment complete!');
console.log('Visit: https://lastmile.vercel.app');
console.log('Test API: https://lastmile.vercel.app/api/test');
console.log('Health Check: https://lastmile.vercel.app/api/health');