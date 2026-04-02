const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OvertimeRule = sequelize.define(
    'OvertimeRule',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(255), allowNull: false },
      
      // Calculation Type (from PagarBook screenshots)
      calculationType: { 
        type: DataTypes.ENUM(
          'POST_PAYABLE_HOURS', 
          'POST_PAYABLE_HOURS_AND_SHIFT_END', 
          'POST_PAYABLE_HOURS_OR_SHIFT_END', 
          'SHIFT_END'
        ), 
        allowNull: false, 
        defaultValue: 'POST_PAYABLE_HOURS'
      },

      // Overtime Type (can be overridden per tier)
      rewardType: {
        type: DataTypes.ENUM(
          'FIXED_AMOUNT', 
          'FIXED_AMOUNT_PER_HOUR', 
          'SALARY_MULTIPLIER'
        ),
        allowNull: false,
        defaultValue: 'FIXED_AMOUNT'
      },

      // Thresholds and Tiered Rewards (Stored as JSON)
      // Example: [{ minMinutes: 60, value: 1.5 }, { minMinutes: 120, value: 2.0 }]
      thresholds: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
      },

      // Special Flags
      giveHalfDayOvertime: { type: DataTypes.BOOLEAN, defaultValue: false },
      halfDayThresholdMinutes: { type: DataTypes.INTEGER, allowNull: true },
      
      giveFullDayOvertime: { type: DataTypes.BOOLEAN, defaultValue: false },
      fullDayThresholdMinutes: { type: DataTypes.INTEGER, allowNull: true },

      active: { type: DataTypes.BOOLEAN, defaultValue: true },
      orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'org_account_id' }
    },
    {
      tableName: 'overtime_rules',
      underscored: true,
    }
  );

  return OvertimeRule;
};
