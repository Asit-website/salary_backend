'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('payroll_lines', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      cycle_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      earnings: { type: Sequelize.JSON, allowNull: true },
      incentives: { type: Sequelize.JSON, allowNull: true },
      deductions: { type: Sequelize.JSON, allowNull: true },
      totals: { type: Sequelize.JSON, allowNull: true },
      attendance_summary: { type: Sequelize.JSON, allowNull: true },
      adjustments: { type: Sequelize.JSON, allowNull: true },
      remarks: { type: Sequelize.TEXT, allowNull: true },
      status: { type: Sequelize.ENUM('INCLUDED', 'EXCLUDED'), allowNull: false, defaultValue: 'INCLUDED' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('payroll_lines', ['cycle_id']);
    await queryInterface.addIndex('payroll_lines', ['cycle_id', 'user_id'], { unique: true, name: 'ux_payroll_lines_cycle_user' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('payroll_lines');
  }
};
