const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'routes', 'admin.js');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
  const lLower = line.toLowerCase();
  if (lLower.includes('notification') || lLower.includes('alert') || lLower.includes('push')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
