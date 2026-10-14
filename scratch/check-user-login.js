const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const phone = '9905141674';
const password = 'Thinktech@123';

(async () => {
  const c = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'thinktech_attendance',
  });

  const [users] = await c.query(
    'SELECT id, phone, role, active, org_account_id, password_hash, failed_login_attempts, lockout_until FROM users WHERE phone = ?',
    [phone]
  );
  console.log('users:', users.length, users);

  if (!users.length) {
    console.log('NO USER with this phone');
    await c.end();
    return;
  }

  for (const u of users) {
    const ok = u.password_hash ? await bcrypt.compare(password, u.password_hash) : false;
    console.log(`id=${u.id} role=${u.role} active=${u.active} org=${u.org_account_id} pwdMatch=${ok} lockout=${u.lockout_until}`);
    if (u.org_account_id) {
      const [orgs] = await c.query('SELECT id, name, status FROM org_accounts WHERE id = ?', [u.org_account_id]);
      console.log('  org:', orgs[0]);
      const [subs] = await c.query(
        "SELECT id, status, end_at FROM subscriptions WHERE org_account_id = ? AND status = 'ACTIVE' ORDER BY end_at DESC LIMIT 1",
        [u.org_account_id]
      );
      console.log('  sub:', subs[0] || 'none');
    }
  }

  await c.end();
})();
