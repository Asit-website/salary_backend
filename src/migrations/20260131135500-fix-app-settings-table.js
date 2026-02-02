'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // First, drop the unique constraint on 'key' if it exists
    try {
      await queryInterface.removeIndex('app_settings', 'key');
    } catch (e) {
      // Index might not exist, ignore
    }
    try {
      await queryInterface.removeIndex('app_settings', 'app_settings_key');
    } catch (e) {
      // Index might not exist, ignore
    }
    try {
      await queryInterface.removeConstraint('app_settings', 'app_settings_key');
    } catch (e) {
      // Constraint might not exist, ignore
    }

    // Change value column to TEXT
    await queryInterface.changeColumn('app_settings', 'value', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    // Add org_account_id column if not exists
    const tableDesc = await queryInterface.describeTable('app_settings');
    if (!tableDesc.org_account_id) {
      await queryInterface.addColumn('app_settings', 'org_account_id', {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
      });
    }

    // Add composite unique index on key + org_account_id
    try {
      await queryInterface.addIndex('app_settings', ['key', 'org_account_id'], {
        unique: true,
        name: 'unique_key_org',
      });
    } catch (e) {
      // Index might already exist, ignore
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove composite index
    try {
      await queryInterface.removeIndex('app_settings', 'unique_key_org');
    } catch (e) {}

    // Remove org_account_id column
    try {
      await queryInterface.removeColumn('app_settings', 'org_account_id');
    } catch (e) {}

    // Change value back to VARCHAR(255)
    await queryInterface.changeColumn('app_settings', 'value', {
      type: Sequelize.STRING(255),
      allowNull: false,
    });

    // Add back unique constraint on key
    await queryInterface.addIndex('app_settings', ['key'], {
      unique: true,
      name: 'app_settings_key',
    });
  },
};
