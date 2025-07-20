const fs = require('fs');

// Read the file content
const content = fs.readFileSync('./middleware/errorHandler.js', 'utf8');

// Check if module.exports is at the end
const lines = content.split('\n');
const lastLines = lines.slice(-20);

console.log('Last 20 lines:');
lastLines.forEach((line, index) => {
  console.log(`${lines.length - 20 + index + 1}: ${line}`);
});

// Try to require it
try {
  const errorHandler = require('./middleware/errorHandler');
  console.log('\nExported keys:', Object.keys(errorHandler));
  console.log('ErrorHandler type:', typeof errorHandler.ErrorHandler);
} catch (e) {
  console.error('Require error:', e.message);
}