#!/usr/bin/env node

/**
 * Vercel Environment Variables Setup Script
 * Helps configure environment variables for Vercel deployment
 */

const fs = require('fs');
const path = require('path');

// Read environment variables from .env.local
function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Environment file not found: ${filePath}`);
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  
  content.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#') && line.includes('=')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=');
      env[key.trim()] = value.trim();
    }
  });
  
  return env;
}

// Generate Vercel CLI commands
function generateVercelCommands(env) {
  const commands = [];
  
  // Required environment variables for production
  const requiredVars = [
    'MONGODB_URI',
    'JWT_SECRET',
    'JWT_EXPIRES_IN',
    'JWT_REFRESH_SECRET',
    'JWT_REFRESH_EXPIRES_IN',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_API_URL',
    'FRONTEND_URL',
    'APP_NAME',
    'NODE_ENV',
    'BCRYPT_SALT_ROUNDS',
    'EMAIL_FROM',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'SMTP_FROM',
    'ADMIN_EMAIL'
  ];

  // Optional environment variables
  const optionalVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'GOOGLE_MAPS_API_KEY',
    'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY',
    'REDIS_URL',
    'NEXT_PUBLIC_ENABLE_REAL_TIME',
    'NEXT_PUBLIC_ENABLE_NOTIFICATIONS',
    'NEXT_PUBLIC_ENABLE_PAYMENTS',
    'NEXT_PUBLIC_ENABLE_GEOLOCATION',
    'NEXT_PUBLIC_DEBUG_MODE',
    'LOG_LEVEL'
  ];

  console.log('🔧 Required Environment Variables:');
  console.log('==================================');
  
  requiredVars.forEach(key => {
    if (env[key]) {
      commands.push(`vercel env add ${key} production`);
      console.log(`✅ ${key}: ${env[key].substring(0, 20)}${env[key].length > 20 ? '...' : ''}`);
    } else {
      console.log(`❌ ${key}: MISSING`);
    }
  });

  console.log('\n🔧 Optional Environment Variables:');
  console.log('==================================');
  
  optionalVars.forEach(key => {
    if (env[key]) {
      commands.push(`vercel env add ${key} production`);
      console.log(`✅ ${key}: ${env[key].substring(0, 20)}${env[key].length > 20 ? '...' : ''}`);
    } else {
      console.log(`⚪ ${key}: Not set`);
    }
  });

  return commands;
}

// Generate batch script for Windows
function generateBatchScript(commands, env) {
  let batchContent = '@echo off\n';
  batchContent += 'echo Setting up Vercel environment variables...\n\n';
  
  commands.forEach(cmd => {
    const key = cmd.split(' ')[3];
    const value = env[key];
    if (value) {
      // Escape special characters for batch
      const escapedValue = value.replace(/"/g, '""');
      batchContent += `echo Setting ${key}...\n`;
      batchContent += `echo "${escapedValue}" | ${cmd}\n\n`;
    }
  });
  
  batchContent += 'echo Done!\npause\n';
  
  fs.writeFileSync('setup-vercel-env.bat', batchContent);
  console.log('\n📝 Generated: setup-vercel-env.bat');
}

// Generate shell script for Unix/Linux/Mac
function generateShellScript(commands, env) {
  let shellContent = '#!/bin/bash\n\n';
  shellContent += 'echo "Setting up Vercel environment variables..."\n\n';
  
  commands.forEach(cmd => {
    const key = cmd.split(' ')[3];
    const value = env[key];
    if (value) {
      // Escape special characters for shell
      const escapedValue = value.replace(/'/g, "'\"'\"'");
      shellContent += `echo "Setting ${key}..."\n`;
      shellContent += `echo '${escapedValue}' | ${cmd}\n\n`;
    }
  });
  
  shellContent += 'echo "Done!"\n';
  
  fs.writeFileSync('setup-vercel-env.sh', shellContent);
  fs.chmodSync('setup-vercel-env.sh', '755');
  console.log('📝 Generated: setup-vercel-env.sh');
}

// Generate manual setup instructions
function generateManualInstructions(env) {
  let instructions = '# Manual Vercel Environment Setup\n\n';
  instructions += 'Copy and paste these values in your Vercel dashboard:\n';
  instructions += 'Go to: https://vercel.com/dashboard → Your Project → Settings → Environment Variables\n\n';
  
  Object.entries(env).forEach(([key, value]) => {
    instructions += `## ${key}\n`;
    instructions += `${value}\n\n`;
  });
  
  fs.writeFileSync('VERCEL_ENV_SETUP.md', instructions);
  console.log('📝 Generated: VERCEL_ENV_SETUP.md');
}

// Main function
function main() {
  console.log('🚀 Vercel Environment Setup');
  console.log('===========================\n');
  
  // Read environment variables
  const envPath = path.join(__dirname, '..', '.env.local');
  const env = readEnvFile(envPath);
  
  if (Object.keys(env).length === 0) {
    console.error('❌ No environment variables found. Make sure .env.local exists.');
    process.exit(1);
  }
  
  // Generate commands
  const commands = generateVercelCommands(env);
  
  console.log('\n🛠️  Setup Options:');
  console.log('==================');
  console.log('1. Use generated batch script (Windows): setup-vercel-env.bat');
  console.log('2. Use generated shell script (Unix/Mac): ./setup-vercel-env.sh');
  console.log('3. Manual setup using: VERCEL_ENV_SETUP.md');
  console.log('4. Use Vercel CLI commands directly\n');
  
  // Generate scripts
  generateBatchScript(commands, env);
  generateShellScript(commands, env);
  generateManualInstructions(env);
  
  console.log('\n📋 Vercel CLI Commands:');
  console.log('=======================');
  commands.forEach(cmd => {
    console.log(cmd);
  });
  
  console.log('\n✅ Setup files generated successfully!');
  console.log('\nNext steps:');
  console.log('1. Install Vercel CLI: npm i -g vercel');
  console.log('2. Login to Vercel: vercel login');
  console.log('3. Run one of the generated scripts or set variables manually');
  console.log('4. Deploy: vercel --prod');
}

// Run the script
main();