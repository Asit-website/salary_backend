require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });
  const [dbs] = await c.query("SHOW DATABASES LIKE 'thinktech_attendance'");
  console.log('database exists:', dbs.length > 0);
  if (!dbs.length) {
    await c.end();
    return;
  }
  const [count] = await c.query(
    "SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = 'thinktech_attendance'",
  );
  console.log('tables in dictionary:', count[0].n);
  const [broken] = await c.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'thinktech_attendance' AND engine IS NULL LIMIT 10",
  );
  console.log('broken (no engine):', broken.map((r) => r.TABLE_NAME || r.table_name));
  await c.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
