const fs = require('fs');
const s = fs.readFileSync(process.argv[2], 'utf8');
const re = /CREATE TABLE `([^`]+)`/g;
const m = new Map();
let x;
while ((x = re.exec(s))) {
  const k = x[1].toLowerCase();
  const arr = m.get(k) || [];
  arr.push(x[1]);
  m.set(k, arr);
}
[...m.entries()]
  .filter(([, arr]) => arr.length > 1)
  .forEach(([k, arr]) => console.log(k, '->', arr.join(', ')));
