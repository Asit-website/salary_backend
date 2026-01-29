'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('otp_verifies', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      phone: { type: Sequelize.STRING(20), allowNull: false },
      code: { type: Sequelize.STRING(12), allowNull: false },
      expiresAt: { type: Sequelize.DATE, allowNull: false },
      consumedAt: { type: Sequelize.DATE, allowNull: true },
      lastSentAt: { type: Sequelize.DATE, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('otp_verifies', ['phone']);
    await queryInterface.addIndex('otp_verifies', ['expiresAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('otp_verifies');
  }
};
