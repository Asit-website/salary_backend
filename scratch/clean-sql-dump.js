const fs = require('fs');

const src = process.argv[2] || 'C:/Users/manoj/Desktop/ThinkTech/thinktech_attendance_maria.sql';
const dst = process.argv[3] || 'C:/Users/manoj/Desktop/ThinkTech/thinktech_attendance_clean.sql';

let s = fs.readFileSync(src, 'utf8');
s = s.replace(
  /-- Table structure for table `sequelizemeta`[\s\S]*?CREATE TABLE `sequelizemeta` \([\s\S]*?\) ENGINE=InnoDB[^;]+;/,
  '',
);
s = s.replace(/INSERT INTO `sequelizemeta`/g, 'INSERT INTO `SequelizeMeta`');
s = s.replace(/ALTER TABLE `sequelizemeta`/g, 'ALTER TABLE `SequelizeMeta`');
s = s.replace(/Indexes for table `sequelizemeta`/g, 'Indexes for table `SequelizeMeta`');
fs.writeFileSync(dst, s);
console.log('written', (fs.statSync(dst).size / 1e6).toFixed(1), 'MB ->', dst);
