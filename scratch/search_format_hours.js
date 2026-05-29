const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', 'salary_frontend', 'src', 'components', 'AttendanceManagement.js');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log('Searching for formatWorkingHours in AttendanceManagement.js...');

lines.forEach((line, idx) => {
  if (line.includes("formatWorkingHours") || line.includes("const formatWorkingHours")) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
