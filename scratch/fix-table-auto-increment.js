/**
 * Fix broken AUTO_INCREMENT after SQL import (rows with id=0 cause ER_DUP_ENTRY).
 * Usage: node scratch/fix-table-auto-increment.js [table1 table2 ...]
 * Default tables: refresh_tokens, users, notifications, subscriptions, audit_logs
 */
require('dotenv').config();
const { sequelize } = require('../src/models');

const DEFAULT_TABLES = ['refresh_tokens', 'users', 'notifications', 'subscriptions', 'audit_logs'];

async function fixTable(table) {
  const [maxRows] = await sequelize.query(`SELECT COALESCE(MAX(id), 0) AS maxId FROM \`${table}\``);
  const maxId = Number(maxRows[0]?.maxId || 0);
  const [zeroRows] = await sequelize.query(`SELECT COUNT(*) AS c FROM \`${table}\` WHERE id = 0`);
  const zeroCount = Number(zeroRows[0]?.c || 0);
  if (zeroCount > 0) {
    console.log(`[${table}] reassigning ${zeroCount} row(s) with id=0...`);
    let next = maxId + 1;
    const [ids] = await sequelize.query(`SELECT id FROM \`${table}\` WHERE id = 0`);
    for (const row of ids) {
      await sequelize.query(`UPDATE \`${table}\` SET id = ? WHERE id = 0 LIMIT 1`, { replacements: [next] });
      next += 1;
    }
  }
  const [maxAfter] = await sequelize.query(`SELECT COALESCE(MAX(id), 0) AS maxId FROM \`${table}\``);
  const nextAi = Number(maxAfter[0]?.maxId || 0) + 1;
  await sequelize.query(`ALTER TABLE \`${table}\` AUTO_INCREMENT = ${nextAi}`);
  console.log(`[${table}] AUTO_INCREMENT set to ${nextAi}`);
}

async function main() {
  const tables = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_TABLES;
  await sequelize.authenticate();
  for (const t of tables) {
    try {
      await fixTable(t);
    } catch (e) {
      console.warn(`[${t}] skip:`, e.original?.sqlMessage || e.message);
    }
  }
  await sequelize.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
