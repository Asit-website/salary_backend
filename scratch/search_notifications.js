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
      const lower = content.toLowerCase();
      if (
        lower.includes('missingcheck') ||
        lower.includes('attendance') ||
        lower.includes('notification') ||
        lower.includes('birthday') ||
        lower.includes('anniversary') ||
        lower.includes('late')
      ) {
        // Print lines containing push notification, sendNotification, or expo-push-token
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          const lLower = line.toLowerCase();
          if (
            lLower.includes('push') &&
            (lLower.includes('notification') || lLower.includes('token') || lLower.includes('send') || lLower.includes('expo'))
          ) {
            const relPath = path.relative(srcDir, fullPath);
            console.log(`${relPath}:${index + 1}: ${line.trim()}`);
          }
        });
      }
    }
  }
}

scanDir(srcDir);
