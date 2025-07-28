#!/usr/bin/env node

const crypto = require('crypto');

console.log('🔐 Generating secure secrets for your Vercel deployment...\n');

// Generate JWT Secret (64 characters)
const jwtSecret = crypto.randomBytes(32).toString('hex');

// Generate NextAuth Secret (64 characters)
const nextAuthSecret = crypto.randomBytes(32).toString('hex');

console.log('📋 **COPY THESE VALUES TO VERCEL:**');
console.log('=====================================\n');

console.log('🔑 **JWT_SECRET:**');
console.log(jwtSecret);
console.log('');

console.log('🔑 **NEXTAUTH_SECRET:**');
console.log(nextAuthSecret);
console.log('');

console.log('🌐 **NEXTAUTH_URL:**');
console.log('https://your-project-name.vercel.app');
console.log('(Replace "your-project-name" with your actual Vercel project name)');
console.log('');

console.log('🗄️ **MONGODB_URI:**');
console.log('mongodb+srv://username:password@cluster.mongodb.net/lastmile-delivery?retryWrites=true&w=majority');
console.log('(Replace with your actual MongoDB connection string)');
console.log('');

console.log('📝 **Next Steps:**');
console.log('1. Go to https://vercel.com/dashboard');
console.log('2. Select your project');
console.log('3. Go to Settings → Environment Variables');
console.log('4. Add each variable above');
console.log('5. Set environment to "Production"');
console.log('6. Run: npm run deploy:vercel');
console.log('');

console.log('💡 **Optional Variables (add later if needed):**');
console.log('- EMAIL_FROM, EMAIL_SERVER_HOST, EMAIL_SERVER_PORT, EMAIL_SERVER_USER, EMAIL_SERVER_PASSWORD');
console.log('- STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY');
console.log('- GOOGLE_MAPS_API_KEY');