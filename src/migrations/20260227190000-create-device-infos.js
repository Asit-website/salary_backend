'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('device_infos', {
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
      device_id: { type: Sequelize.STRING(128), allowNull: false },
      brand: { type: Sequelize.STRING(80), allowNull: true },
      model: { type: Sequelize.STRING(120), allowNull: true },
      platform: { type: Sequelize.STRING(40), allowNull: true },
      os_version: { type: Sequelize.STRING(60), allowNull: true },
      app_version: { type: Sequelize.STRING(40), allowNull: true },
      user_agent: { type: Sequelize.STRING(255), allowNull: true },
      last_seen_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('device_infos', ['org_account_id', 'user_id', 'device_id'], {
      unique: true,
      name: 'ux_device_infos_org_user_device',
    });
    await queryInterface.addIndex('device_infos', ['org_account_id', 'last_seen_at'], {
      name: 'ix_device_infos_org_last_seen',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('device_infos');
  },
};

