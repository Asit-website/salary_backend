const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');
console.log('srcDir path:', srcDir);
console.log('Does srcDir exist?', fs.existsSync(srcDir));

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  console.log(`Scanning dir: ${dir}, contains ${files.length} items`);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else if (file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.toLowerCase().includes('notification') || content.toLowerCase().includes('alert')) {
        console.log(`Found match in file: ${path.relative(srcDir, fullPath)}`);
      }
    }
  }
}

scanDir(srcDir);
