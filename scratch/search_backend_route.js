const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'routes', 'attendance.js');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log('Searching for GET handlers and checkIn/checkOut formation in routes/attendance.js...');

let capturing = false;
let braceCount = 0;

lines.forEach((line, idx) => {
  if (line.includes("router.get(") || line.includes("router.post(")) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
  if (line.includes("checkIn:") || line.includes("checkOut:")) {
    console.log(`Found checkIn/checkOut formatting at line ${idx + 1}: ${line.trim()}`);
  }
});
