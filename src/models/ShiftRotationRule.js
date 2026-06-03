const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ShiftRotationRule = sequelize.define(
    'ShiftRotationRule',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'org_account_id' },
      shiftRotationGroupId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'shift_rotation_group_id' },
      startShiftTemplateId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'start_shift_template_id' },
      alternateShiftTemplateId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'alternate_shift_template_id' },
      cycleDays: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 15, field: 'cycle_days' },
      cycleStartType: { 
        type: DataTypes.ENUM('FIRST_MONDAY_OF_MONTH', 'SPECIFIC_DATE'), 
        allowNull: false, 
        defaultValue: 'FIRST_MONDAY_OF_MONTH', 
        field: 'cycle_start_type' 
      },
      excludeWeeklyOff: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'exclude_weekly_off'
      },
      anchorDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'anchor_date' },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: 'shift_rotation_rules',
      underscored: true,
    }
  );

  ShiftRotationRule.associate = (models) => {
    ShiftRotationRule.belongsTo(models.OrgAccount, { foreignKey: 'orgAccountId', as: 'orgAccount' });
    ShiftRotationRule.belongsTo(models.ShiftRotationGroup, { foreignKey: 'shiftRotationGroupId', as: 'group' });
    ShiftRotationRule.belongsTo(models.ShiftTemplate, { foreignKey: 'startShiftTemplateId', as: 'startShift' });
    ShiftRotationRule.belongsTo(models.ShiftTemplate, { foreignKey: 'alternateShiftTemplateId', as: 'alternateShift' });
  };

  return ShiftRotationRule;
};
