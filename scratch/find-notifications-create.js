const fs = require('fs');
const t = fs.readFileSync(process.argv[2], 'utf8');
const needle = 'CREATE TABLE `notifications`';
let pos = 0;
let n = 0;
while (true) {
  const idx = t.indexOf(needle, pos);
  if (idx === -1) break;
  n += 1;
  const line = t.slice(0, idx).split('\n').length;
  console.log('occurrence', n, 'line', line);
  pos = idx + needle.length;
}
