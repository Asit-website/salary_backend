'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('orders', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      client_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      assigned_job_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      order_date: { type: Sequelize.DATE, allowNull: false },
      payment_method: { type: Sequelize.STRING(20), allowNull: true },
      remarks: { type: Sequelize.TEXT, allowNull: true },
      proof_url: { type: Sequelize.STRING(255), allowNull: true },
      net_amount: { type: Sequelize.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
      gst_amount: { type: Sequelize.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
      total_amount: { type: Sequelize.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
      meta: { type: Sequelize.JSON, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('orders', ['user_id']);
    await queryInterface.addIndex('orders', ['client_id']);
    await queryInterface.addIndex('orders', ['assigned_job_id']);

    await queryInterface.createTable('order_items', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      order_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      name: { type: Sequelize.STRING(150), allowNull: false },
      size: { type: Sequelize.STRING(50), allowNull: true },
      qty: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      price: { type: Sequelize.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
      amount: { type: Sequelize.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
      meta: { type: Sequelize.JSON, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('order_items', ['order_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('order_items');
    await queryInterface.dropTable('orders');
  },
};
