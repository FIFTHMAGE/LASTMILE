#!/usr/bin/env node

const crypto = require('crypto');

console.log('🚀 **COMPLETE VERCEL ENVIRONMENT SETUP**');
console.log('=========================================\n');

// Generate secure secrets
const jwtSecret = 'f17491dc9936725de57680174e1c705ed31cfb831ab609f7dc5718404baa16ac';
const nextAuthSecret = '99d9d31527cdbf9f6ad3379fd370204b70d3df2016098fe2022bbf60810ef0cd';

console.log('📋 **REQUIRED ENVIRONMENT VARIABLES FOR VERCEL:**');
console.log('================================================\n');

console.log('Variable Name: MONGODB_URI');
console.log('Value: mongodb+srv://olakumaps:JdE3fCzP1ZexSeHr@cluster0.qpnev0l.mongodb.net/lastmile-delivery?retryWrites=true&w=majority&appName=Cluster0');
console.log('');

console.log('Variable Name: JWT_SECRET');
console.log('Value: ' + jwtSecret);
console.log('');

console.log('Variable Name: NEXTAUTH_SECRET');
console.log('Value: ' + nextAuthSecret);
console.log('');

console.log('Variable Name: NEXTAUTH_URL');
console.log('Value: https://your-project-name.vercel.app');
console.log('(⚠️  IMPORTANT: Replace "your-project-name" with your actual Vercel project name)');
console.log('');

console.log('🔧 **HOW TO ADD THESE TO VERCEL:**');
console.log('=================================');
console.log('1. Go to https://vercel.com/dashboard');
console.log('2. Click on your project');
console.log('3. Go to Settings → Environment Variables');
console.log('4. Click "Add New"');
console.log('5. For each variable above:');
console.log('   - Enter the Variable Name');
console.log('   - Enter the Value');
console.log('   - Select "Production" environment');
console.log('   - Click "Save"');
console.log('');

console.log('📱 **OR USE VERCEL CLI (FASTER):**');
console.log('=================================');
console.log('Run these commands one by one:');
console.log('');
console.log('vercel env add MONGODB_URI');
console.log('# Paste: mongodb+srv://olakumaps:JdE3fCzP1ZexSeHr@cluster0.qpnev0l.mongodb.net/lastmile-delivery?retryWrites=true&w=majority&appName=Cluster0');
console.log('');
console.log('vercel env add JWT_SECRET');
console.log('# Paste: ' + jwtSecret);
console.log('');
console.log('vercel env add NEXTAUTH_SECRET');
console.log('# Paste: ' + nextAuthSecret);
console.log('');
console.log('vercel env add NEXTAUTH_URL');
console.log('# Paste: https://your-project-name.vercel.app');
console.log('');

console.log('✅ **AFTER SETTING UP ENVIRONMENT VARIABLES:**');
console.log('==============================================');
console.log('1. Run: npm run deploy:vercel');
console.log('2. Test: https://your-project-name.vercel.app/api/health');
console.log('3. If successful, your backend will be working!');
console.log('');

console.log('🔍 **TROUBLESHOOTING:**');
console.log('======================');
console.log('If deployment fails:');
console.log('1. Check Vercel function logs: vercel logs');
console.log('2. Verify all 4 environment variables are set');
console.log('3. Make sure NEXTAUTH_URL matches your actual Vercel URL');
console.log('4. Test locally first: cd lastmile-nextjs && npm run dev');