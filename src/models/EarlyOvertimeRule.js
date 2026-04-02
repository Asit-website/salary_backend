const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EarlyOvertimeRule = sequelize.define(
    'EarlyOvertimeRule',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(255), allowNull: false },
      
      calculationType: { 
        type: DataTypes.ENUM(
          'SHIFT_START',
          'FIXED_BEFORE_SHIFT'
        ), 
        allowNull: false, 
        defaultValue: 'SHIFT_START'
      },

      rewardType: {
        type: DataTypes.ENUM(
          'FIXED_AMOUNT', 
          'FIXED_AMOUNT_PER_HOUR', 
          'SALARY_MULTIPLIER'
        ),
        allowNull: false,
        defaultValue: 'FIXED_AMOUNT'
      },

      thresholds: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
      },

      active: { type: DataTypes.BOOLEAN, defaultValue: true },
      orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'org_account_id' }
    },
    {
      tableName: 'early_overtime_rules',
      underscored: true,
    }
  );

  return EarlyOvertimeRule;
};
