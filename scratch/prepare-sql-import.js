const fs = require('fs');

const src = process.argv[2];
const dst = process.argv[3];
let s = fs.readFileSync(src, 'utf8');

s = s.replace(/utf8mb4_0900_ai_ci/g, 'utf8mb4_unicode_ci');
s = s.replace(/utf8mb4_0900_as_cs/g, 'utf8mb4_unicode_ci');
s = s.replace(
  /-- Table structure for table `sequelizemeta`[\s\S]*?CREATE TABLE `sequelizemeta` \([\s\S]*?\) ENGINE=InnoDB[^;]+;/,
  '',
);
s = s.replace(/INSERT INTO `sequelizemeta`/g, 'INSERT INTO `SequelizeMeta`');
s = s.replace(/ALTER TABLE `sequelizemeta`/g, 'ALTER TABLE `SequelizeMeta`');
s = s.replace(/Indexes for table `sequelizemeta`/g, 'Indexes for table `SequelizeMeta`');

// Replace each CREATE with DROP+CREATE so dev backend (db.js) cannot block import mid-run.
s = s.replace(/CREATE TABLE `([^`]+)`/g, (match, name) => `DROP TABLE IF EXISTS \`${name}\`;\nCREATE TABLE \`${name}\``);

const header = [
  'SET NAMES utf8mb4;',
  'SET FOREIGN_KEY_CHECKS=0;',
  'CREATE DATABASE IF NOT EXISTS `thinktech_attendance`;',
  'USE `thinktech_attendance`;',
  '',
].join('\n');

if (!/^USE `thinktech_attendance`/m.test(s)) {
  s = header + s;
}
s += '\nSET FOREIGN_KEY_CHECKS=1;\n';

fs.writeFileSync(dst, s);
console.log('Prepared', (fs.statSync(dst).size / 1e6).toFixed(1), 'MB ->', dst);
