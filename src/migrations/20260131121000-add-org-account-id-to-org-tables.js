'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add org_account_id to org_brands if not exists
    const brandsDesc = await queryInterface.describeTable('org_brands');
    if (!brandsDesc.org_account_id) {
      await queryInterface.addColumn('org_brands', 'org_account_id', {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
      });
    }

    // Add org_account_id to org_bank_accounts if not exists
    const bankDesc = await queryInterface.describeTable('org_bank_accounts');
    if (!bankDesc.org_account_id) {
      await queryInterface.addColumn('org_bank_accounts', 'org_account_id', {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
      });
    }

    // Add org_account_id to org_kyb if not exists
    const kybDesc = await queryInterface.describeTable('org_kyb');
    if (!kybDesc.org_account_id) {
      await queryInterface.addColumn('org_kyb', 'org_account_id', {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
      });
    }

    // Add org_account_id to org_business_info if not exists
    const bizDesc = await queryInterface.describeTable('org_business_info');
    if (!bizDesc.org_account_id) {
      await queryInterface.addColumn('org_business_info', 'org_account_id', {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('org_brands', 'org_account_id');
    await queryInterface.removeColumn('org_bank_accounts', 'org_account_id');
    await queryInterface.removeColumn('org_kyb', 'org_account_id');
    await queryInterface.removeColumn('org_business_info', 'org_account_id');
  },
};
