const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StaffLatePunchInAssignment = sequelize.define(
    'StaffLatePunchInAssignment',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'user_id' },
      latePunchInRuleId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'late_punch_in_rule_id' },
      
      effectiveFrom: { type: DataTypes.DATEONLY, allowNull: false, field: 'effective_from' },
      effectiveTo: { type: DataTypes.DATEONLY, allowNull: true, field: 'effective_to' },
      
      active: { type: DataTypes.BOOLEAN, defaultValue: true },
      orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'org_account_id' }
    },
    {
      tableName: 'staff_late_punchin_assignments',
      underscored: true,
    }
  );

  return StaffLatePunchInAssignment;
};
