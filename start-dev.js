#!/usr/bin/env node
/**
 * Development Server Starter
 * Starts both backend and frontend servers and opens browser
 */

const { spawn, exec } = require('child_process');
const path = require('path');

console.log('🚀 Starting LastMile Development Environment...\n');

// Update frontend API URL to match backend port
const fs = require('fs');
const frontendEnvPath = path.join(__dirname, 'frontend', '.env');
const backendPort = process.env.PORT || 9000;

// Update frontend .env file
const frontendEnvContent = `GENERATE_SOURCEMAP=false
CI=false
ESLINT_NO_DEV_ERRORS=true
TSC_COMPILE_ON_ERROR=true
REACT_APP_API_URL=http://localhost:${backendPort}/api
`;

fs.writeFileSync(frontendEnvPath, frontendEnvContent);
console.log(`✅ Updated frontend API URL to http://localhost:${backendPort}/api`);

// Function to open browser
function openBrowser(url) {
  const start = (process.platform === 'darwin' ? 'open' : 
                process.platform === 'win32' ? 'start' : 'xdg-open');
  
  setTimeout(() => {
    console.log(`🌐 Opening browser: ${url}`);
    exec(`${start} ${url}`);
  }, 3000); // Wait 3 seconds for servers to start
}

// Start backend server
console.log('🔧 Starting backend server...');
const backend = spawn('node', ['test-server.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

backend.on('error', (error) => {
  console.error('❌ Backend server error:', error);
});

// Start frontend server
console.log('🎨 Starting frontend server...');
const frontend = spawn('npm', ['start'], {
  stdio: 'inherit',
  cwd: path.join(__dirname, 'frontend'),
  shell: true
});

frontend.on('error', (error) => {
  console.error('❌ Frontend server error:', error);
});

// Open browser after delay
openBrowser('http://localhost:3000');

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down development servers...');
  backend.kill('SIGINT');
  frontend.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down development servers...');
  backend.kill('SIGTERM');
  frontend.kill('SIGTERM');
  process.exit(0);
});

console.log('\n📋 Development Environment Info:');
console.log(`   Backend:  http://localhost:${backendPort}`);
console.log('   Frontend: http://localhost:3000');
console.log('   Browser will open automatically in 3 seconds...');
console.log('\n🧪 Demo Credentials:');
console.log('   Business: business@demo.com / demo123');
console.log('   Rider:    rider@demo.com / demo123');
console.log('   Admin:    admin@demo.com / demo123');
console.log('\n💡 Press Ctrl+C to stop all servers');