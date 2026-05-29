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
      if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
};

const apkSrcDir = path.join(__dirname, '..', '..', 'thinktech_apk', 'src');
const files = walk(apkSrcDir);

console.log(`Found ${files.length} source files in thinktech_apk/src. Searching...`);

files.forEach((file) => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('24') || content.includes('night') || content.includes('shift') || content.includes('Hour') || content.includes('minute') || content.includes('time')) {
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('24') && (line.includes('time') || line.includes('hour') || line.includes('format') || line.includes('Math') || line.includes('Split') || line.includes(':'))) {
        console.log(`${path.basename(file)}:${idx + 1}: ${line.trim().substring(0, 100)}`);
      }
    });
  }
});
