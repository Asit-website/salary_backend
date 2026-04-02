const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EarlyExitRule = sequelize.define(
    'EarlyExitRule',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(255), allowNull: false },
      
      // Deduction Type (matches PagarBook screenshots)
      deductionType: {
        type: DataTypes.ENUM(
          'FIXED_AMOUNT', 
          'SALARY_MULTIPLIER'
        ),
        allowNull: false,
        defaultValue: 'FIXED_AMOUNT'
      },

      // Thresholds and Fines (Stored as JSON)
      // Example: [{ minMinutes: 15, rewardType: 'FIXED_AMOUNT', rewardValue: 100 }]
      thresholds: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
      },

      // Half/Full Day Deduction Flags
      deductHalfDay: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'deduct_half_day' },
      halfDayThresholdMinutes: { type: DataTypes.INTEGER, allowNull: true, field: 'half_day_threshold_minutes' },
      
      deductFullDay: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'deduct_full_day' },
      fullDayThresholdMinutes: { type: DataTypes.INTEGER, allowNull: true, field: 'full_day_threshold_minutes' },

      active: { type: DataTypes.BOOLEAN, defaultValue: true },
      orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'org_account_id' }
    },
    {
      tableName: 'early_exit_rules',
      underscored: true,
    }
  );

  return EarlyExitRule;
};
