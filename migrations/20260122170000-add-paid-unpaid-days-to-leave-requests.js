'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('leave_requests', 'paid_days', { type: Sequelize.DECIMAL(10,2), allowNull: true });
    await queryInterface.addColumn('leave_requests', 'unpaid_days', { type: Sequelize.DECIMAL(10,2), allowNull: true });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('leave_requests', 'paid_days');
    await queryInterface.removeColumn('leave_requests', 'unpaid_days');
  }
};
