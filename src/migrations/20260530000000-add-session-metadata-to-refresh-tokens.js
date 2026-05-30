'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('refresh_tokens', 'ip_address', { type: Sequelize.STRING(45), allowNull: true });
    await queryInterface.addColumn('refresh_tokens', 'user_agent', { type: Sequelize.STRING(500), allowNull: true });
    await queryInterface.addColumn('refresh_tokens', 'device_fingerprint', { type: Sequelize.STRING(255), allowNull: true });
    await queryInterface.addColumn('refresh_tokens', 'last_activity_at', { type: Sequelize.DATE, allowNull: true });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('refresh_tokens', 'ip_address');
    await queryInterface.removeColumn('refresh_tokens', 'user_agent');
    await queryInterface.removeColumn('refresh_tokens', 'device_fingerprint');
    await queryInterface.removeColumn('refresh_tokens', 'last_activity_at');
  }
};
