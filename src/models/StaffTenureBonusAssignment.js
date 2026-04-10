const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StaffTenureBonusAssignment = sequelize.define(
    'StaffTenureBonusAssignment',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'user_id' },
      tenureBonusRuleId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'tenure_bonus_rule_id' },
      effectiveFrom: { type: DataTypes.DATEONLY, allowNull: false, field: 'effective_from' },
      effectiveTo: { type: DataTypes.DATEONLY, allowNull: true, field: 'effective_to' },
    },
    {
      tableName: 'staff_tenure_bonus_assignments',
      underscored: true,
      indexes: [
        { unique: true, fields: ['user_id', 'effective_from'] }
      ],
    }
  );

  return StaffTenureBonusAssignment;
};
