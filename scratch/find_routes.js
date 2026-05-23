const fs = require('fs');
const readline = require('readline');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'routes', 'admin.js');

const rl = readline.createInterface({
  input: fs.createReadStream(filePath),
  output: process.stdout,
  terminal: false
});

let lineNumber = 0;
rl.on('line', (line) => {
  lineNumber++;
  if (line.includes('lateArrival') || line.includes('latePunchInMinutes') || line.includes("router.get('/dashboard")) {
    console.log(`${lineNumber}: ${line.trim()}`);
  }
});
