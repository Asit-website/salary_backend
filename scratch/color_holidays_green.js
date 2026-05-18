const fs = require('fs');
const path = 'src/routes/admin.js';
let content = fs.readFileSync(path, 'utf8');

const target = "fgColor: { argb: 'FFFF0000' }";
const replacement = "fgColor: { argb: 'FFC6EFCE' }"; // Light Green (Excel style)

if (content.indexOf(target) === -1) {
    console.error('Target not found exactly.');
    process.exit(1);
}

content = content.replace(target, replacement);
fs.writeFileSync(path, content);
console.log('Successfully updated holiday color to green in src/routes/admin.js');
