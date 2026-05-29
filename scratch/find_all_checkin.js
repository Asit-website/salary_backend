const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.js')) {
        results.push(file);
      }
    }
  });
  return results;
};

const srcDir = path.join(__dirname, '..', 'src');
const files = walk(srcDir);

files.forEach((file) => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('24') || content.includes('Hour') || content.includes('punchedInAt') || content.includes('toTime')) {
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('checkIn') && (line.includes('format') || line.includes('split') || line.includes('Date') || line.includes('Time') || line.includes('hh') || line.includes('HH'))) {
        console.log(`${path.relative(srcDir, file)}:${idx + 1}: ${line.trim()}`);
      }
    });
  }
});
