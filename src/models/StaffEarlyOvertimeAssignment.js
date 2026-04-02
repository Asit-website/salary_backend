const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StaffEarlyOvertimeAssignment = sequelize.define(
    'StaffEarlyOvertimeAssignment',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      earlyOvertimeRuleId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'early_overtime_rule_id' },
      orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'org_account_id' },
      effectiveFrom: { type: DataTypes.DATEONLY, allowNull: false, field: 'effective_from' },
      effectiveTo: { type: DataTypes.DATEONLY, allowNull: true, field: 'effective_to' },
    },
    { tableName: 'staff_early_overtime_assignments', underscored: true }
  );

  return StaffEarlyOvertimeAssignment;
};
