const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', 'salary_frontend', 'src', 'components', 'AttendanceManagement.js');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log('--- Search columns and render in AttendanceManagement.js ---');
let foundColumns = false;
let start = 0;
lines.forEach((line, idx) => {
  if (line.includes('const columns =') || line.includes('columns =') || line.includes('render:')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
