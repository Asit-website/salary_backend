const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

(async () => {
  const c = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'thinktech_attendance',
  });
  const [rows] = await c.query(
    "SELECT id, phone, role, active FROM users WHERE role = 'superadmin' OR phone IN ('9999999999', '7488228840') LIMIT 15"
  );
  console.log('users:', rows);
  const passwords = ['Thinktech@123', 'admin123', 'Admin@123', 'password'];
  for (const r of rows) {
    const [full] = await c.query('SELECT password_hash FROM users WHERE id = ?', [r.id]);
    const hash = full[0]?.password_hash;
    if (!hash) {
      console.log(r.phone, 'NO HASH');
      continue;
    }
    for (const p of passwords) {
      const ok = await bcrypt.compare(p, hash);
      if (ok) console.log('MATCH', r.phone, r.role, p);
    }
  }
  await c.end();
})();
