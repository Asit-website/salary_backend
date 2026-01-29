'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sales_targets', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      staff_user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      period: { type: Sequelize.ENUM('daily', 'weekly', 'monthly'), allowNull: false },
      period_date: { type: Sequelize.DATEONLY, allowNull: false },
      target_amount: { type: Sequelize.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
      target_orders: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('sales_targets', ['staff_user_id', 'period', 'period_date']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('sales_targets');
  },
};
