'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const qi = queryInterface;
    const sequelize = qi.sequelize;

    // Pick any admin/superadmin as creator
    const [admins] = await sequelize.query("SELECT id FROM users WHERE role IN ('admin','superadmin') ORDER BY id ASC LIMIT 1");
    const adminId = admins && admins[0] ? admins[0].id : null;

    // Pick any staff user
    const [staffs] = await sequelize.query("SELECT id FROM users WHERE role = 'staff' ORDER BY id ASC LIMIT 1");
    if (!staffs || !staffs[0]) {
      throw new Error('No staff user found. Create a staff user first (via /admin/staff or SAMPLE_STAFF env)');
    }
    const staffUserId = staffs[0].id;

    // Insert a sample client
    const now = new Date();
    await qi.bulkInsert('clients', [{
      name: 'Sample Client One',
      phone: '9876543210',
      client_type: 'Retailer',
      location: 'Bandra, Mumbai',
      extra: JSON.stringify({ source: 'seed' }),
      created_by: adminId,
      created_at: now,
      updated_at: now,
    }]);

    const [clientRows] = await sequelize.query("SELECT id FROM clients WHERE name = 'Sample Client One' ORDER BY id DESC LIMIT 1");
    const clientId = clientRows && clientRows[0] ? clientRows[0].id : null;
    if (!clientId) throw new Error('Failed to resolve seeded client id');

    // Insert a sample assigned job
    await qi.bulkInsert('assigned_jobs', [{
      client_id: clientId,
      staff_user_id: staffUserId,
      title: 'First Visit',
      description: 'Discuss pricing, order confirmation, collect feedback',
      status: 'pending',
      assigned_on: now,
      due_date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3),
      created_at: now,
      updated_at: now,
    }]);

    // Insert a sample sales target for today (daily)
    const isoDate = new Date().toISOString().slice(0, 10);
    await qi.bulkInsert('sales_targets', [{
      staff_user_id: staffUserId,
      period: 'daily',
      period_date: isoDate,
      target_amount: 25000,
      target_orders: 40,
      created_at: now,
      updated_at: now,
    }]);
  },

  async down(queryInterface) {
    const qi = queryInterface;
    const sequelize = qi.sequelize;
    // Remove seeded rows by unique markers
    await qi.bulkDelete('sales_targets', { period: 'daily' });
    await qi.bulkDelete('assigned_jobs', { title: 'First Visit' });
    await qi.bulkDelete('clients', { name: 'Sample Client One' });
  },
};
