const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StaffOvertimeAssignment = sequelize.define(
    'StaffOvertimeAssignment',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      overtimeRuleId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      effectiveFrom: { type: DataTypes.DATEONLY, allowNull: false },
      effectiveTo: { type: DataTypes.DATEONLY, allowNull: true },
    },
    { tableName: 'staff_overtime_assignments', underscored: true }
  );

  return StaffOvertimeAssignment;
};
