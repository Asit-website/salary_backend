const fs = require('fs');
const path = 'src/routes/admin.js';
let content = fs.readFileSync(path, 'utf8');

const target = 'OT Full Days: ${stats.otFullDays}';
const replacement = 'Extra OT Days: ${stats.otFullDays}';

if (content.indexOf(target) === -1) {
    console.error('Target not found exactly.');
    process.exit(1);
}

content = content.replace(target, replacement);
fs.writeFileSync(path, content);
console.log('Successfully updated label in src/routes/admin.js');
