const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else if (file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        const lLower = line.toLowerCase();
        if (lLower.includes('sendsms') || lLower.includes('api/mt/sendsms')) {
          const relPath = path.relative(srcDir, fullPath);
          console.log(`${relPath}:${index + 1}: ${line.trim()}`);
        }
      });
    }
  }
}

scanDir(srcDir);
