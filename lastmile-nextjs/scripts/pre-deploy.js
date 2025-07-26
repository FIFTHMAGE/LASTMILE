#!/usr/bin/env node

/**
 * Pre-deployment script to check if everything is ready for Vercel deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 LastMile Delivery - Pre-deployment Check\n');

const checks = [];

// Check if required files exist
const requiredFiles = [
  'package.json',
  'next.config.ts',
  'tailwind.config.js',
  'tsconfig.json',
  '.env.example',
  'vercel.json'
];

console.log('📁 Checking required files...');
requiredFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, '..', file));
  checks.push({ name: `${file} exists`, passed: exists });
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
});

// Check package.json scripts
console.log('\n📦 Checking package.json scripts...');
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const requiredScripts = ['build', 'start', 'dev'];

requiredScripts.forEach(script => {
  const exists = packageJson.scripts && packageJson.scripts[script];
  checks.push({ name: `${script} script exists`, passed: !!exists });
  console.log(`  ${exists ? '✅' : '❌'} ${script} script`);
});

// Check for TypeScript configuration
console.log('\n🔧 Checking TypeScript configuration...');
const tsConfigExists = fs.existsSync(path.join(__dirname, '..', 'tsconfig.json'));
checks.push({ name: 'TypeScript config exists', passed: tsConfigExists });
console.log(`  ${tsConfigExists ? '✅' : '❌'} tsconfig.json`);

// Check for Tailwind configuration
console.log('\n🎨 Checking Tailwind CSS configuration...');
const tailwindConfigExists = fs.existsSync(path.join(__dirname, '..', 'tailwind.config.js'));
checks.push({ name: 'Tailwind config exists', passed: tailwindConfigExists });
console.log(`  ${tailwindConfigExists ? '✅' : '❌'} tailwind.config.js`);

// Check environment variables example
console.log('\n🔐 Checking environment configuration...');
const envExampleExists = fs.existsSync(path.join(__dirname, '..', '.env.example'));
checks.push({ name: '.env.example exists', passed: envExampleExists });
console.log(`  ${envExampleExists ? '✅' : '❌'} .env.example`);

if (envExampleExists) {
  const envExample = fs.readFileSync(path.join(__dirname, '..', '.env.example'), 'utf8');
  const requiredEnvVars = [
    'MONGODB_URI',
    'JWT_SECRET',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL'
  ];
  
  requiredEnvVars.forEach(envVar => {
    const exists = envExample.includes(envVar);
    checks.push({ name: `${envVar} in .env.example`, passed: exists });
    console.log(`  ${exists ? '✅' : '❌'} ${envVar}`);
  });
}

// Check API routes structure
console.log('\n🛠️ Checking API routes structure...');
const apiDir = path.join(__dirname, '..', 'src', 'app', 'api');
const apiExists = fs.existsSync(apiDir);
checks.push({ name: 'API directory exists', passed: apiExists });
console.log(`  ${apiExists ? '✅' : '❌'} API directory`);

if (apiExists) {
  const criticalRoutes = ['auth', 'offers', 'user'];
  criticalRoutes.forEach(route => {
    const routeExists = fs.existsSync(path.join(apiDir, route));
    checks.push({ name: `${route} API route exists`, passed: routeExists });
    console.log(`  ${routeExists ? '✅' : '❌'} /api/${route}`);
  });
}

// Check components structure
console.log('\n🧩 Checking components structure...');
const componentsDir = path.join(__dirname, '..', 'src', 'components');
const componentsExist = fs.existsSync(componentsDir);
checks.push({ name: 'Components directory exists', passed: componentsExist });
console.log(`  ${componentsExist ? '✅' : '❌'} Components directory`);

if (componentsExist) {
  const criticalComponents = ['ui', 'forms', 'layout', 'auth'];
  criticalComponents.forEach(component => {
    const componentExists = fs.existsSync(path.join(componentsDir, component));
    checks.push({ name: `${component} components exist`, passed: componentExists });
    console.log(`  ${componentExists ? '✅' : '❌'} ${component} components`);
  });
}

// Summary
console.log('\n📊 Pre-deployment Summary');
console.log('=' .repeat(50));

const passedChecks = checks.filter(check => check.passed).length;
const totalChecks = checks.length;
const successRate = Math.round((passedChecks / totalChecks) * 100);

console.log(`✅ Passed: ${passedChecks}/${totalChecks} checks (${successRate}%)`);

if (passedChecks === totalChecks) {
  console.log('\n🎉 All checks passed! Ready for deployment.');
  console.log('\nNext steps:');
  console.log('1. Set up environment variables in Vercel dashboard');
  console.log('2. Run: cd lastmile-nextjs && vercel --prod');
  console.log('3. Test the deployed application');
  process.exit(0);
} else {
  console.log('\n⚠️  Some checks failed. Please fix the issues before deploying.');
  console.log('\nFailed checks:');
  checks.filter(check => !check.passed).forEach(check => {
    console.log(`  ❌ ${check.name}`);
  });
  process.exit(1);
}