'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove old unique constraint on month_key only
    try {
      await queryInterface.removeIndex('payroll_cycles', 'ux_payroll_cycles_month_key');
    } catch (e) {
      console.log('Index ux_payroll_cycles_month_key might not exist');
    }
    try {
      await queryInterface.removeIndex('payroll_cycles', 'payroll_cycles_month_key');
    } catch (e) {}
    try {
      await queryInterface.removeConstraint('payroll_cycles', 'payroll_cycles_month_key');
    } catch (e) {}

    // Add org_account_id column if not exists
    const tableDesc = await queryInterface.describeTable('payroll_cycles');
    if (!tableDesc.org_account_id) {
      await queryInterface.addColumn('payroll_cycles', 'org_account_id', {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
      });
    }

    // Add composite unique index on month_key + org_account_id
    try {
      await queryInterface.addIndex('payroll_cycles', ['month_key', 'org_account_id'], {
        unique: true,
        name: 'ux_payroll_cycles_month_org',
      });
    } catch (e) {
      console.log('Index might already exist:', e.message);
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.removeIndex('payroll_cycles', 'ux_payroll_cycles_month_org');
    } catch (e) {}
    
    await queryInterface.addIndex('payroll_cycles', ['month_key'], {
      unique: true,
      name: 'ux_payroll_cycles_month_key',
    });
  },
};
