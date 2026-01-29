'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('payroll_cycles', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      month_key: { type: Sequelize.STRING(7), allowNull: false },
      status: { type: Sequelize.ENUM('DRAFT', 'LOCKED', 'PAID'), allowNull: false, defaultValue: 'DRAFT' },
      notes: { type: Sequelize.TEXT, allowNull: true },
      locked_at: { type: Sequelize.DATE, allowNull: true },
      locked_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      paid_at: { type: Sequelize.DATE, allowNull: true },
      paid_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('payroll_cycles', ['month_key'], { unique: true, name: 'ux_payroll_cycles_month_key' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('payroll_cycles');
  }
};
