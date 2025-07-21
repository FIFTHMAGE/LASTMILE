#!/usr/bin/env node

// Force CI to false to ignore ESLint warnings
process.env.CI = 'false';
process.env.GENERATE_SOURCEMAP = 'false';

// Run the build
const { spawn } = require('child_process');

const build = spawn('npm', ['run', 'build'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    CI: 'false',
    GENERATE_SOURCEMAP: 'false'
  }
});

build.on('close', (code) => {
  process.exit(code);
});