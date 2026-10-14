'use strict';

const bcrypt = require('bcryptjs');

const DEFAULT_USER_PASSWORD = process.env.DEFAULT_USER_PASSWORD || 'Thinktech@123';

module.exports = {
  async up(queryInterface) {
    const passwordHash = await bcrypt.hash(DEFAULT_USER_PASSWORD, 10);
    await queryInterface.sequelize.query(
      'UPDATE users SET password_hash = :passwordHash, updated_at = :updatedAt',
      {
        replacements: {
          passwordHash,
          updatedAt: new Date(),
        },
      }
    );
  },

  async down() {
    // Irreversible: previous hashes are not retained.
  },
};
