const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Subscription = sequelize.define(
    'Subscription',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'org_account_id' },
      planId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'plan_id' },
      startAt: { type: DataTypes.DATE, allowNull: false },
      endAt: { type: DataTypes.DATE, allowNull: false },
      status: { type: DataTypes.ENUM('ACTIVE', 'EXPIRED', 'CANCELED'), allowNull: false, defaultValue: 'ACTIVE' },
      meta: { type: DataTypes.JSON, allowNull: true },
      staffLimit: { type: DataTypes.INTEGER, allowNull: true, field: 'staff_limit' },
      maxGeolocationStaff: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'max_geolocation_staff',
        defaultValue: 0
      },
      salesEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'sales_enabled'
      },
      geolocationEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'geolocation_enabled'
      },
      expenseEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'expense_enabled'
      },
      payrollEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'payroll_enabled'
      },
      performanceEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'performance_enabled'
      },
      aiReportsEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'ai_reports_enabled'
      },
      aiAssistantEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'ai_assistant_enabled'
      },
      taskManagementEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'task_management_enabled'
      },
      rosterEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'roster_enabled'
      },
      recruitmentEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'recruitment_enabled'
      },
      communityEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'community_enabled'
      },
      salaryRegisterEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'salary_register_enabled'
      },
      monthlySummaryEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'monthly_summary_enabled'
      },
      perDaySalaryEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'per_day_salary_enabled'
      },
      comparisonEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'comparison_enabled'
      },
      otImpactEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'ot_impact_enabled'
      },
      latePenaltyEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'late_penalty_enabled'
      },
      attendanceLocationEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'attendance_location_enabled'
      }
    },
    { tableName: 'subscriptions', underscored: true }
  );

  return Subscription;
};
