const fs = require('fs');
const path = 'src/routes/admin.js';
let content = fs.readFileSync(path, 'utf8');

const target = 'Present: ${stats.present}';
const replacement = 'Present (including present on weekly off and holiday): ${stats.present}';

const target2 = 'Extra Present: ${stats.extraPresent}';
const replacement2 = 'Extra Present on Weekly Off/Holiday: ${stats.extraPresent}';

if (content.indexOf(target) === -1 || content.indexOf(target2) === -1) {
    console.error('Targets not found exactly.');
    process.exit(1);
}

content = content.replace(target, replacement);
content = content.replace(target2, replacement2);

fs.writeFileSync(path, content);
console.log('Successfully updated labels in src/routes/admin.js');
