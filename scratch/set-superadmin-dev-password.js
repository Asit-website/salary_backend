const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const password = process.env.DEV_PASSWORD || 'Thinktech@123';

(async () => {
  const hash = await bcrypt.hash(password, 10);
  const c = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'thinktech_attendance',
  });
  const [r] = await c.query("UPDATE users SET password_hash = ? WHERE role = 'superadmin'", [hash]);
  console.log(`Updated ${r.affectedRows} superadmin row(s). Password: ${password}`);
  const [rows] = await c.query("SELECT phone, role FROM users WHERE role = 'superadmin' LIMIT 5");
  console.log('Superadmin phones:', rows.map((x) => x.phone).join(', '));
  await c.end();
})();
