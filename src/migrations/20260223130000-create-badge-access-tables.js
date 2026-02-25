'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('badges', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      org_account_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'org_accounts', key: 'id' },
        onDelete: 'CASCADE',
      },
      name: { type: Sequelize.STRING(80), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_by_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      updated_by_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('badges', ['org_account_id', 'name'], { unique: true, name: 'ux_badges_org_name' });

    await queryInterface.createTable('badge_permissions', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      org_account_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'org_accounts', key: 'id' },
        onDelete: 'CASCADE',
      },
      badge_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'badges', key: 'id' },
        onDelete: 'CASCADE',
      },
      permission_key: { type: Sequelize.STRING(100), allowNull: false },
      permission_label: { type: Sequelize.STRING(120), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('badge_permissions', ['badge_id', 'permission_key'], { unique: true, name: 'ux_badge_perm' });
    await queryInterface.addIndex('badge_permissions', ['org_account_id', 'permission_key'], { name: 'ix_badge_perm_org_key' });

    await queryInterface.createTable('staff_badges', {
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
      badge_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'badges', key: 'id' },
        onDelete: 'CASCADE',
      },
      assigned_by_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      assigned_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('staff_badges', ['org_account_id', 'user_id', 'badge_id'], { unique: true, name: 'ux_staff_badges_org_user_badge' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('staff_badges');
    await queryInterface.dropTable('badge_permissions');
    await queryInterface.dropTable('badges');
  },
};

