const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'uploads/payslips/2026-02');
if (!fs.existsSync(dir)) {
    console.log('Dir not found');
    process.exit(1);
}

const files = fs.readdirSync(dir).map(f => {
    const s = fs.statSync(path.join(dir, f));
    return { name: f, size: s.size, mtime: s.mtime };
});

files.sort((a, b) => b.mtime - a.mtime);

if (files.length === 0) {
    console.log('No files found');
} else {
    const latest = files[0];
    console.log('Latest file:', latest.name);
    console.log('Size:', latest.size, 'bytes');
    console.log('Path:', path.join(dir, latest.name));
}
