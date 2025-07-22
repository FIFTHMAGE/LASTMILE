#!/usr/bin/env node

// Vercel build script
// Force CI to false to ignore ESLint warnings
process.env.CI = 'false';
process.env.GENERATE_SOURCEMAP = 'false';
process.env.ESLINT_NO_DEV_ERRORS = 'true';

const { execSync } = require('child_process');

try {
  console.log('Building React app for Vercel...');
  console.log('Setting CI=false to prevent treating warnings as errors');
  
  // Use cross-platform environment variable setting
  const buildCommand = process.platform === 'win32' 
    ? 'set "CI=false" && set "ESLINT_NO_DEV_ERRORS=true" && react-scripts build'
    : 'CI=false ESLINT_NO_DEV_ERRORS=true react-scripts build';
  
  execSync(buildCommand, { 
    stdio: 'inherit',
    env: {
      ...process.env,
      CI: 'false',
      ESLINT_NO_DEV_ERRORS: 'true',
      GENERATE_SOURCEMAP: 'false'
    }
  });
  
  console.log('Build completed successfully');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}