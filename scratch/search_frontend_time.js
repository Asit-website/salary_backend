const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', 'salary_frontend', 'src', 'components', 'AttendanceManagement.js');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log('--- Search in AttendanceManagement.js ---');
lines.forEach((line, idx) => {
  if (line.includes('punch') || line.includes('In') || line.includes('Out') || line.includes('time') || line.includes('Time') || line.includes(':') || line.includes('format')) {
    if (line.length < 120) {
      console.log(`${idx + 1}: ${line.trim()}`);
    } else {
      console.log(`${idx + 1}: ${line.trim().substring(0, 120)}...`);
    }
  }
});
