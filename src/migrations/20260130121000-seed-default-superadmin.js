"use strict";

const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface, Sequelize) {
    const phone = '6290909090';
    const [rows] = await queryInterface.sequelize.query(
      "SELECT id FROM users WHERE phone = :phone LIMIT 1",
      { replacements: { phone } }
    );

    const passwordHash = await bcrypt.hash('123456', 10);

    if (rows && rows.length > 0) {
      const id = rows[0].id;
      await queryInterface.bulkUpdate('users', {
        role: 'superadmin',
        active: 1,
        password_hash: passwordHash,
      }, { id });
    } else {
      await queryInterface.bulkInsert('users', [{
        role: 'superadmin',
        org_account_id: null,
        phone,
        password_hash: passwordHash,
        active: 1,
        created_at: new Date(),
        updated_at: new Date(),
      }]);
    }
  },

  async down(queryInterface, Sequelize) {
    // Optional: demote or remove this seeded superadmin
    await queryInterface.bulkUpdate('users', { role: 'admin' }, { phone: '6290909090', role: 'superadmin' });
  }
};
