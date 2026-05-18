const fs = require('fs');
const path = 'src/routes/admin.js';
let content = fs.readFileSync(path, 'utf8');

const target = `          } else if (h === 'OT') {
            const otRes = stats.otResultsMap[dStr];
            if (otRes && otRes.minutes > 0) {
              cell.value = \`\${Math.floor(otRes.minutes / 60)}:\${String(otRes.minutes % 60).padStart(2, '0')}\`;
            } else if (otRes && otRes.isFullDay) {
              cell.value = '0:00';
            } else {
              cell.value = '';
            }`;

const replacement = `          } else if (h === 'OT') {
            const otRes = stats.otResultsMap[dStr];
            if (otRes) {
              const mins = otRes.isFullDay ? (otRes.actualMinutes || 0) : (otRes.minutes || 0);
              if (mins > 0) {
                const timeStr = \`\${Math.floor(mins / 60)}:\${String(mins % 60).padStart(2, '0')}\`;
                cell.value = otRes.isFullDay ? \`\${timeStr} (1 day)\` : timeStr;
              } else {
                cell.value = '';
              }
            } else {
              cell.value = '';
            }`;

if (content.indexOf(target) === -1) {
  console.error('Target not found exactly. Trying regex...');
  const regex = /else if \(h === 'OT'\) {[\s\S]*?cell\.value = '';\s*}/;
  content = content.replace(regex, replacement);
  fs.writeFileSync(path, content);
  console.log('Successfully updated src/routes/admin.js using regex');
} else {
  content = content.replace(target, replacement);
  fs.writeFileSync(path, content);
  console.log('Successfully updated src/routes/admin.js using exact match');
}
