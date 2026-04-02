const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StaffBreakAssignment = sequelize.define(
    'StaffBreakAssignment',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'user_id' },
      breakRuleId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'break_rule_id' },
      orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'org_account_id' },
      
      effectiveFrom: { type: DataTypes.DATEONLY, allowNull: false, field: 'effective_from' },
      effectiveTo: { type: DataTypes.DATEONLY, allowNull: true, field: 'effective_to' },
    },
    {
      tableName: 'staff_break_assignments',
      underscored: true,
      indexes: [{ fields: ['user_id', 'org_account_id'] }]
    }
  );

  return StaffBreakAssignment;
};
