require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize } = require('../src/sequelize');

(async () => {
  const [rows] = await sequelize.query(
    'SELECT id, phone, role, LENGTH(password_hash) AS len FROM users'
  );
  console.log('users', rows);

  const [full] = await sequelize.query(
    "SELECT password_hash FROM users WHERE phone = '9999999999'"
  );
  const hash = full[0]?.password_hash;
  const ok = await bcrypt.compare('Thinktech@123', hash || '');
  console.log('compare Thinktech@123', ok);

  const resp = await fetch('http://localhost:4000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '9999999999', password: 'Thinktech@123' }),
  });
  const json = await resp.json();
  console.log('status', resp.status);
  console.log('body', {
    success: json.success,
    requireSelection: json.requireSelection,
    hasToken: !!json.token,
    role: json.user?.role,
    message: json.message,
  });

  await sequelize.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
