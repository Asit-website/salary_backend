"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('payroll_lines', 'paid_at', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('payroll_lines', 'paid_mode', { type: Sequelize.STRING(32), allowNull: true });
    await queryInterface.addColumn('payroll_lines', 'paid_ref', { type: Sequelize.STRING(191), allowNull: true });
    await queryInterface.addColumn('payroll_lines', 'paid_amount', { type: Sequelize.DECIMAL(12,2), allowNull: true });
    await queryInterface.addColumn('payroll_lines', 'paid_by', { type: Sequelize.BIGINT.UNSIGNED, allowNull: true });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('payroll_lines', 'paid_at');
    await queryInterface.removeColumn('payroll_lines', 'paid_mode');
    await queryInterface.removeColumn('payroll_lines', 'paid_ref');
    await queryInterface.removeColumn('payroll_lines', 'paid_amount');
    await queryInterface.removeColumn('payroll_lines', 'paid_by');
  }
};
