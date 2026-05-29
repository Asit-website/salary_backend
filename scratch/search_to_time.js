const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'routes', 'admin.js');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log('Searching for toTime in admin.js...');

lines.forEach((line, idx) => {
  if (line.includes("toTime") || line.includes("function toTime")) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
