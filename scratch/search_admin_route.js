const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'routes', 'admin.js');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log('Searching for /attendance in src/routes/admin.js...');

lines.forEach((line, idx) => {
  if (line.includes("router.get('/attendance'") || line.includes("router.get(\"/attendance\"") || (line.includes("checkIn") && line.includes(":") && (line.includes("Date") || line.includes("format") || line.includes("get") || line.includes("Hour") || line.includes("shift") || line.includes("punch")))) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
