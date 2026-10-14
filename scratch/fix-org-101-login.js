const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const ORG_ID = 101;
const ORG_PHONE = '9905141674';
const ADMIN_PHONE = '8709790175';
const DEV_PASSWORD = 'Thinktech@123';

(async () => {
  const c = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'thinktech_attendance',
  });

  const [org] = await c.query('SELECT id, name, phone, status FROM org_accounts WHERE id = ?', [ORG_ID]);
  console.log('Org before:', org[0]);

  const [users] = await c.query(
    'SELECT id, phone, role, active, org_account_id FROM users WHERE org_account_id = ? OR phone IN (?, ?)',
    [ORG_ID, ORG_PHONE, ADMIN_PHONE]
  );
  console.log('Users:', users);

  const hash = await bcrypt.hash(DEV_PASSWORD, 10);

  await c.query("UPDATE org_accounts SET status = 'ACTIVE' WHERE id = ?", [ORG_ID]);

  const admin = users.find((u) => u.phone === ADMIN_PHONE);
  if (admin) {
    await c.query('UPDATE users SET password_hash = ?, active = 1 WHERE id = ?', [hash, admin.id]);
    console.log('Updated admin password for', ADMIN_PHONE);
  }

  let loginPhone = ORG_PHONE;
  const orgPhoneUser = users.find((u) => u.phone === ORG_PHONE);
  if (!orgPhoneUser) {
    const [ins] = await c.query(
      `INSERT INTO users (phone, password_hash, role, active, org_account_id, created_at, updated_at)
       VALUES (?, ?, 'admin', 1, ?, NOW(), NOW())`,
      [ORG_PHONE, hash, ORG_ID]
    );
    console.log('Created admin user for org phone', ORG_PHONE, 'id', ins.insertId);
  } else {
    await c.query('UPDATE users SET password_hash = ?, active = 1, role = ?, org_account_id = ? WHERE id = ?', [
      hash,
      'admin',
      ORG_ID,
      orgPhoneUser.id,
    ]);
    console.log('Updated existing user', ORG_PHONE);
  }

  const [orgAfter] = await c.query('SELECT id, name, phone, status FROM org_accounts WHERE id = ?', [ORG_ID]);
  console.log('Org after:', orgAfter[0]);
  console.log('\nLogin with:');
  console.log('  Phone:', loginPhone, '(or admin', ADMIN_PHONE + ')');
  console.log('  Password:', DEV_PASSWORD);

  await c.end();
})();
