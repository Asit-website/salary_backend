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
      giveExtraFullDayBonus: { type: DataTypes.BOOLEAN, defaultValue: false },
      extraFullDayBonusAmount: { type: DataTypes.INTEGER, defaultValue: 25 },


      includeEarlyArrival: { type: DataTypes.BOOLEAN, defaultValue: false },
      ignoreLateInOT: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'ignore_late_in_ot' },
      calculateOnGross: { type: DataTypes.BOOLEAN, defaultValue: false },

      // Custom Overrides for Weekly Off and Holiday Overtime
      overrideWeeklyOffMultiplier: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'override_weekly_off_multiplier' },
      weeklyOffMultiplier: { type: DataTypes.DECIMAL(5, 2), allowNull: true, field: 'weekly_off_multiplier' },
      weeklyOffRewardType: { type: DataTypes.STRING(50), defaultValue: 'SALARY_MULTIPLIER', field: 'weekly_off_reward_type' },

      overrideHolidayMultiplier: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'override_holiday_multiplier' },
      holidayMultiplier: { type: DataTypes.DECIMAL(5, 2), allowNull: true, field: 'holiday_multiplier' },
      holidayRewardType: { type: DataTypes.STRING(50), defaultValue: 'SALARY_MULTIPLIER', field: 'holiday_reward_type' },

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
