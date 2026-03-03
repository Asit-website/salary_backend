'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('channel_partners', {
      id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, autoIncrement: true, primaryKey: true },
      channel_partner_id: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(150), allowNull: false },
      phone: { type: Sequelize.STRING(30), allowNull: true },
      business_email: { type: Sequelize.STRING(150), allowNull: true },
      state: { type: Sequelize.STRING(100), allowNull: true },
      city: { type: Sequelize.STRING(100), allowNull: true },
      role_description: { type: Sequelize.TEXT, allowNull: true },
      employee_count: { type: Sequelize.STRING(50), allowNull: true },
      client_type: { type: Sequelize.STRING(50), allowNull: true },
      location: { type: Sequelize.STRING(255), allowNull: true },
      extra: { type: Sequelize.JSON, allowNull: true },
      status: { type: Sequelize.ENUM('ACTIVE', 'DISABLED', 'SUSPENDED'), allowNull: false, defaultValue: 'ACTIVE' },
      created_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('channel_partners', ['phone']);
    await queryInterface.addIndex('channel_partners', ['channel_partner_id'], { unique: true });
    await queryInterface.addIndex('channel_partners', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('channel_partners');
  }
};
