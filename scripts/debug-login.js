#!/usr/bin/env node
/**
 * Debug Login Issues
 */

const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function debugLogin(email, password) {
  console.log('🔍 Debugging login for:', email);
  console.log('Password provided:', password ? '***' : 'NONE');
  console.log('');

  try {
    // Step 1: Check if user exists
    console.log('Step 1: Looking for user in database...');
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('❌ User not found in database');
      console.log('Available users:');
      
      // List all users for debugging
      const allUsers = await User.find({}, 'email name role isVerified');
      if (allUsers.length === 0) {
        console.log('   No users found in database');
        console.log('   Run: node scripts/create-demo-users.js');
      } else {
        allUsers.forEach(u => {
          console.log(`   - ${u.email} (${u.role}) - Verified: ${u.isVerified}`);
        });
      }
      return;
    }

    console.log('✅ User found:', {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      isVerified: user.isVerified,
      hasPassword: !!user.password
    });

    // Step 2: Check password
    if (!password) {
      console.log('❌ No password provided');
      return;
    }

    console.log('Step 2: Checking password...');
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (passwordMatch) {
      console.log('✅ Password matches!');
      console.log('✅ Login should succeed');
    } else {
      console.log('❌ Password does not match');
      console.log('Stored password hash:', user.password.substring(0, 20) + '...');
      
      // Test with a fresh hash
      console.log('Testing password hash generation...');
      const testHash = await bcrypt.hash(password, 10);
      const testMatch = await bcrypt.compare(password, testHash);
      console.log('Fresh hash test:', testMatch ? 'PASS' : 'FAIL');
    }

    // Step 3: Check verification status
    console.log('Step 3: Checking verification status...');
    if (user.isVerified) {
      console.log('✅ User is verified');
    } else {
      console.log('⚠️  User is not verified (but login should still work)');
    }

  } catch (error) {
    console.error('💥 Error during debug:', error);
  }
}

// Command line usage
const email = process.argv[2];
const password = process.argv[3];

if (!email) {
  console.log('Usage: node scripts/debug-login.js <email> [password]');
  console.log('Example: node scripts/debug-login.js business@demo.com demo123');
  process.exit(1);
}

debugLogin(email, password).then(() => {
  console.log('\n🔍 Debug complete');
  process.exit(0);
}).catch(error => {
  console.error('💥 Debug failed:', error);
  process.exit(1);
});