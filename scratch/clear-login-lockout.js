const mysql = require('mysql2/promise');

const phone = process.argv[2] || '9905141674';

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'thinktech_attendance',
  });

  const [r] = await c.query(
    'UPDATE users SET failed_login_attempts = 0, lockout_until = NULL WHERE phone = ?',
    [phone]
  );
  console.log(`Cleared lockout for ${phone}. Rows updated: ${r.affectedRows}`);
  await c.end();
})();
