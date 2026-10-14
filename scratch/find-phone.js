const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'thinktech_attendance',
  });
  const [r] = await c.query(
    "SELECT id, phone, role, active FROM users WHERE phone LIKE '%990514%' OR phone LIKE '%51674%' LIMIT 20"
  );
  console.log(r);
  await c.end();
})();
