const fs = require('fs');
const path = require('path');

const backendAttendancePath = path.join(__dirname, '..', 'src', 'routes', 'attendance.js');
const backendContent = fs.readFileSync(backendAttendancePath, 'utf8');

const lines = backendContent.split('\n');
console.log('--- Search in backend attendance.js ---');
lines.forEach((line, idx) => {
  if (line.includes('punchedInAt') || line.includes('punchedOutAt') || line.includes('Format') || line.includes('format') || line.includes('HH:mm') || line.includes('hh:mm')) {
    if (line.length < 120) {
      console.log(`${idx + 1}: ${line.trim()}`);
    } else {
      console.log(`${idx + 1}: ${line.trim().substring(0, 120)}...`);
    }
  }
});
