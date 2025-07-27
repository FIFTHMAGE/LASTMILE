#!/usr/bin/env node

/**
 * Environment Setup Script for LastMile Delivery Platform
 * This script helps you configure your environment variables
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const envPath = path.join(__dirname, '..', '.env.local');

console.log('🚀 LastMile Delivery Platform - Environment Setup');
console.log('==================================================\n');

const questions = [
  {
    key: 'MONGODB_URI',
    question: 'MongoDB Connection String (press Enter for local MongoDB): ',
    default: 'mongodb://localhost:27017/lastmile-delivery',
    required: true
  },
  {
    key: 'SMTP_USER',
    question: 'Email address for sending notifications: ',
    default: 'your-email@gmail.com',
    required: false
  },
  {
    key: 'SMTP_PASS',
    question: 'Email app password (for Gmail, use App Password): ',
    default: 'your-app-password',
    required: false
  },


];

async function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question.question, (answer) => {
      resolve(answer.trim() || question.default);
    });
  });
}

async function setupEnvironment() {
  console.log('Please provide the following configuration values:\n');
  console.log('💡 Tip: Press Enter to use default values for optional settings\n');

  const envVars = {};

  for (const question of questions) {
    const answer = await askQuestion(question);
    envVars[question.key] = answer;
    
    if (question.key === 'MONGODB_URI' && answer.includes('mongodb+srv://')) {
      console.log('✅ MongoDB Atlas connection detected');
    } else if (question.key === 'MONGODB_URI') {
      console.log('✅ Local MongoDB connection configured');
    }
  }

  // Read current .env.local file
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Update environment variables
  for (const [key, value] of Object.entries(envVars)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    const newLine = `${key}=${value}`;
    
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, newLine);
    } else {
      envContent += `\n${newLine}`;
    }
  }

  // Also update NEXT_PUBLIC versions for client-side access
  if (envVars.STRIPE_PUBLISHABLE_KEY) {
    const publicStripeRegex = /^NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=.*$/m;
    const publicStripeLine = `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${envVars.STRIPE_PUBLISHABLE_KEY}`;
    
    if (publicStripeRegex.test(envContent)) {
      envContent = envContent.replace(publicStripeRegex, publicStripeLine);
    } else {
      envContent += `\n${publicStripeLine}`;
    }
  }

  if (envVars.GOOGLE_MAPS_API_KEY) {
    const publicMapsRegex = /^NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=.*$/m;
    const publicMapsLine = `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${envVars.GOOGLE_MAPS_API_KEY}`;
    
    if (publicMapsRegex.test(envContent)) {
      envContent = envContent.replace(publicMapsRegex, publicMapsLine);
    } else {
      envContent += `\n${publicMapsLine}`;
    }
  }

  // Write updated .env.local file
  fs.writeFileSync(envPath, envContent);

  console.log('\n✅ Environment configuration updated successfully!');
  console.log(`📁 Configuration saved to: ${envPath}`);
  
  console.log('\n🔧 Next Steps:');
  console.log('1. Install dependencies: npm install');
  console.log('2. Start development server: npm run dev');
  console.log('3. Visit http://localhost:3000');
  
  console.log('\n📚 Additional Setup:');
  console.log('- MongoDB: See MONGODB_SETUP.md for detailed database setup');
  console.log('- Stripe: Get test keys from https://dashboard.stripe.com/test/apikeys');
  console.log('- Google Maps: Get API key from https://console.cloud.google.com/apis/credentials');
  console.log('- Email: For Gmail, use App Passwords: https://support.google.com/accounts/answer/185833');

  rl.close();
}

// Handle Ctrl+C gracefully
rl.on('SIGINT', () => {
  console.log('\n\n❌ Setup cancelled by user');
  process.exit(0);
});

setupEnvironment().catch((error) => {
  console.error('❌ Error during setup:', error);
  process.exit(1);
});