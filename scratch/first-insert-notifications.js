const fs = require('fs');
const lines = fs.readFileSync(process.argv[2], 'utf8').split('\n');
lines.forEach((l, i) => {
  if (l.includes('INSERT INTO `notifications`')) {
    console.log('first insert line', i + 1);
    process.exit(0);
  }
});
