const mysql = require('mysql2/promise');

const ORG_ID = 101;

(async () => {
  const c = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'thinktech_attendance',
  });

  const [subs] = await c.query('SELECT id, status, end_at, plan_id FROM subscriptions WHERE org_account_id = ? ORDER BY end_at DESC LIMIT 5', [ORG_ID]);
  console.log('Existing subs:', subs);

  const [plans] = await c.query('SELECT id, name FROM plans ORDER BY id ASC LIMIT 5');
  console.log('Plans sample:', plans);
  const planId = plans[0]?.id || 1;

  const endAt = new Date();
  endAt.setFullYear(endAt.getFullYear() + 1);

  if (subs.length) {
    await c.query(
      "UPDATE subscriptions SET status = 'ACTIVE', end_at = ?, plan_id = COALESCE(plan_id, ?) WHERE org_account_id = ?",
      [endAt, planId, ORG_ID]
    );
    console.log('Updated subscriptions for org', ORG_ID);
  } else {
    await c.query(
      `INSERT INTO subscriptions (org_account_id, plan_id, status, start_at, end_at, created_at, updated_at)
       VALUES (?, ?, 'ACTIVE', NOW(), ?, NOW(), NOW())`,
      [ORG_ID, planId, endAt]
    );
    console.log('Created ACTIVE subscription for org', ORG_ID);
  }

  await c.query("UPDATE org_accounts SET status = 'ACTIVE' WHERE id = ?", [ORG_ID]);

  const [check] = await c.query(
    "SELECT id, status, end_at FROM subscriptions WHERE org_account_id = ? AND status = 'ACTIVE' ORDER BY end_at DESC LIMIT 1",
    [ORG_ID]
  );
  console.log('Active sub now:', check[0]);

  await c.end();
})();
