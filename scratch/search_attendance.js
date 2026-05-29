const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'routes', 'attendance.js');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log('Searching for key terms in attendance.js...');

lines.forEach((line, idx) => {
  const lineNum = idx + 1;
  if (line.includes('night') || line.includes('24') || line.includes('shift') || line.includes('hour')) {
    if (line.length < 120) {
      console.log(`${lineNum}: ${line.trim()}`);
    } else {
      console.log(`${lineNum}: ${line.trim().substring(0, 120)}...`);
    }
  }
});
