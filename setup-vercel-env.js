#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🔧 Setting up Vercel environment variables...\n');

const requiredEnvVars = [
  {
    name: 'MONGODB_URI',
    description: 'MongoDB connection string',
    example: 'mongodb+srv://username:password@cluster.mongodb.net/lastmile-delivery'
  },
  {
    name: 'JWT_SECRET',
    description: 'JWT signing secret (32+ characters)',
    example: 'your-super-secret-jwt-key-minimum-32-characters'
  },
  {
    name: 'NEXTAUTH_SECRET',
    description: 'NextAuth.js secret key',
    example: 'your-nextauth-secret-key'
  },
  {
    name: 'NEXTAUTH_URL',
    description: 'Your app URL',
    example: 'https://your-app-name.vercel.app'
  }
];

const optionalEnvVars = [
  {
    name: 'EMAIL_FROM',
    description: 'From email address',
    example: 'noreply@yourdomain.com'
  },
  {
    name: 'EMAIL_SERVER_HOST',
    description: 'SMTP server host',
    example: 'smtp.gmail.com'
  },
  {
    name: 'EMAIL_SERVER_PORT',
    description: 'SMTP server port',
    example: '587'
  },
  {
    name: 'EMAIL_SERVER_USER',
    description: 'SMTP username',
    example: 'your-email@gmail.com'
  },
  {
    name: 'EMAIL_SERVER_PASSWORD',
    description: 'SMTP password',
    example: 'your-app-password'
  },
  {
    name: 'STRIPE_SECRET_KEY',
    description: 'Stripe secret key',
    example: 'sk_test_...'
  },
  {
    name: 'STRIPE_PUBLISHABLE_KEY',
    description: 'Stripe publishable key',
    example: 'pk_test_...'
  },
  {
    name: 'GOOGLE_MAPS_API_KEY',
    description: 'Google Maps API key',
    example: 'AIza...'
  }
];

console.log('📋 Required Environment Variables:');
console.log('================================');
requiredEnvVars.forEach((envVar, index) => {
  console.log(`${index + 1}. ${envVar.name}`);
  console.log(`   Description: ${envVar.description}`);
  console.log(`   Example: ${envVar.example}`);
  console.log('');
});

console.log('📋 Optional Environment Variables:');
console.log('=================================');
optionalEnvVars.forEach((envVar, index) => {
  console.log(`${index + 1}. ${envVar.name}`);
  console.log(`   Description: ${envVar.description}`);
  console.log(`   Example: ${envVar.example}`);
  console.log('');
});

console.log('🔧 To set environment variables in Vercel:');
console.log('==========================================');
console.log('1. Go to your Vercel dashboard');
console.log('2. Select your project');
console.log('3. Go to Settings > Environment Variables');
console.log('4. Add each variable with its value');
console.log('5. Make sure to set them for Production environment');
console.log('');

console.log('💡 Or use Vercel CLI:');
console.log('vercel env add VARIABLE_NAME');
console.log('');

console.log('🚀 After setting up environment variables, run:');
console.log('node deploy-vercel.js');