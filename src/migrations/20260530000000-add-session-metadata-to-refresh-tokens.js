'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('refresh_tokens').catch(() => ({}));
    const addIfMissing = async (name, def) => {
      if (!table[name]) await queryInterface.addColumn('refresh_tokens', name, def);
    };
    await addIfMissing('ip_address', { type: Sequelize.STRING(45), allowNull: true });
    await addIfMissing('user_agent', { type: Sequelize.STRING(500), allowNull: true });
    await addIfMissing('device_fingerprint', { type: Sequelize.STRING(255), allowNull: true });
    await addIfMissing('last_activity_at', { type: Sequelize.DATE, allowNull: true });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('refresh_tokens', 'ip_address');
    await queryInterface.removeColumn('refresh_tokens', 'user_agent');
    await queryInterface.removeColumn('refresh_tokens', 'device_fingerprint');
    await queryInterface.removeColumn('refresh_tokens', 'last_activity_at');
  }
};
