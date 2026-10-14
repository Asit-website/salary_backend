const fs = require('fs');
const s = fs.readFileSync(process.argv[2], 'utf8');
const re = /CREATE TABLE `([^`]+)`/g;
const m = new Map();
let x;
while ((x = re.exec(s))) {
  m.set(x[1], (m.get(x[1]) || 0) + 1);
}
[...m.entries()]
  .filter(([, c]) => c > 1)
  .sort((a, b) => b[1] - a[1])
  .forEach(([t, c]) => console.log(c, t));
