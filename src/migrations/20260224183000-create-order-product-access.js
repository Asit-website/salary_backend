'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('order_products', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      org_account_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'org_accounts', key: 'id' },
        onDelete: 'CASCADE',
      },
      name: { type: Sequelize.STRING(120), allowNull: false },
      size: { type: Sequelize.STRING(60), allowNull: true },
      default_qty: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
      default_price: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      sort_order: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      created_by_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      updated_by_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('order_products', ['org_account_id', 'name', 'size'], {
      unique: true,
      name: 'ux_order_products_org_name_size',
    });

    await queryInterface.createTable('staff_order_products', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      org_account_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'org_accounts', key: 'id' },
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      order_product_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'order_products', key: 'id' },
        onDelete: 'CASCADE',
      },
      assigned_by_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      assigned_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('staff_order_products', ['org_account_id', 'user_id', 'order_product_id'], {
      unique: true,
      name: 'ux_staff_order_products_org_user_product',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('staff_order_products');
    await queryInterface.dropTable('order_products');
  },
};
