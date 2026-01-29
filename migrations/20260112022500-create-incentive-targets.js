'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('incentive_targets', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      staff_user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      period: { type: Sequelize.ENUM('daily','weekly','monthly'), allowNull: false },
      period_date: { type: Sequelize.DATEONLY, allowNull: false },
      orders_threshold: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      reward_amount: { type: Sequelize.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
      title: { type: Sequelize.STRING(120), allowNull: true },
      note: { type: Sequelize.STRING(255), allowNull: true },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('incentive_targets', ['staff_user_id','period','period_date']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('incentive_targets');
  },
};
