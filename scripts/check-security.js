#!/usr/bin/env node

/**
 * Security Check Script
 * Verifies that sensitive files are properly ignored by git
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔒 LastMile Security Check\n');

// Files that should be ignored
const sensitiveFiles = [
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  'lastmile-nextjs/.env.local',
  'config/keys.js',
  'config/secrets.js',
  'secrets/',
  'api-keys.json'
];

// Check if files exist and are ignored
function checkFileIgnored(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (fs.existsSync(fullPath)) {
    try {
      // Check if file is ignored by git
      execSync(`git check-ignore "${filePath}"`, { stdio: 'pipe' });
      console.log(`✅ ${filePath} - EXISTS and IGNORED`);
      return true;
    } catch (error) {
      console.log(`❌ ${filePath} - EXISTS but NOT IGNORED`);
      return false;
    }
  } else {
    console.log(`ℹ️  ${filePath} - Does not exist`);
    return true;
  }
}

// Check git status for sensitive patterns
function checkGitStatus() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    const lines = status.split('\n').filter(line => line.trim());
    
    const sensitivePatterns = [
      /\.env/,
      /key/i,
      /secret/i,
      /credential/i,
      /token/i
    ];
    
    const suspiciousFiles = lines.filter(line => {
      return sensitivePatterns.some(pattern => pattern.test(line));
    });
    
    if (suspiciousFiles.length > 0) {
      console.log('\n⚠️  Potentially sensitive files in git status:');
      suspiciousFiles.forEach(file => console.log(`   ${file}`));
      return false;
    }
    
    return true;
  } catch (error) {
    console.log('ℹ️  Could not check git status');
    return true;
  }
}

// Main security check
function runSecurityCheck() {
  console.log('Checking sensitive files...\n');
  
  let allSecure = true;
  
  // Check each sensitive file
  sensitiveFiles.forEach(file => {
    if (!checkFileIgnored(file)) {
      allSecure = false;
    }
  });
  
  console.log('\nChecking git status for sensitive patterns...\n');
  
  if (!checkGitStatus()) {
    allSecure = false;
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (allSecure) {
    console.log('✅ SECURITY CHECK PASSED');
    console.log('All sensitive files are properly protected!');
  } else {
    console.log('❌ SECURITY CHECK FAILED');
    console.log('Some sensitive files may be exposed!');
    console.log('\nRecommended actions:');
    console.log('1. Review the files listed above');
    console.log('2. Add them to .gitignore if needed');
    console.log('3. Remove from git history if already committed');
    console.log('4. Rotate any exposed credentials');
  }
  
  console.log('\nFor more information, see SECURITY.md');
}

// Run the check
runSecurityCheck();