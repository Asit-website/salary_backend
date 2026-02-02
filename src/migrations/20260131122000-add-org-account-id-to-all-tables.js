'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = [
      'shift_templates',
      'attendance_templates',
      'salary_templates',
      'sites',
      'routes',
      'leave_templates',
      'holiday_templates',
      'clients',
      'document_types',
      'app_settings',
      'sales_targets',
      'assigned_jobs',
      'geofence_templates',
      'business_functions',
      'payroll_cycles',
      'attendance',
      'staff_profiles',
      'salary_settings',
      'weekly_off_templates',
      'leave_requests',
      'leave_balances',
      'sales_visits',
      'orders',
      'incentive_targets',
      'loans',
      'expense_claims',
    ];

    for (const table of tables) {
      try {
        const desc = await queryInterface.describeTable(table);
        if (!desc.org_account_id) {
          await queryInterface.addColumn(table, 'org_account_id', {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: true,
          });
          console.log(`Added org_account_id to ${table}`);
        } else {
          console.log(`org_account_id already exists in ${table}`);
        }
      } catch (e) {
        console.log(`Skipping ${table}: ${e.message}`);
      }
    }
  },

  async down(queryInterface) {
    const tables = [
      'shift_templates',
      'attendance_templates',
      'salary_templates',
      'sites',
      'routes',
      'leave_templates',
      'holiday_templates',
      'clients',
      'document_types',
      'app_settings',
      'sales_targets',
      'assigned_jobs',
      'geofence_templates',
      'business_functions',
      'payroll_cycles',
      'attendance',
      'staff_profiles',
      'salary_settings',
      'weekly_off_templates',
      'leave_requests',
      'leave_balances',
      'sales_visits',
      'orders',
      'incentive_targets',
      'loans',
      'expense_claims',
    ];

    for (const table of tables) {
      try {
        await queryInterface.removeColumn(table, 'org_account_id');
      } catch (e) {
        console.log(`Skipping ${table}: ${e.message}`);
      }
    }
  },
};
