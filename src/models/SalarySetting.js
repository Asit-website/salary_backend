const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SalarySetting = sequelize.define(
    'SalarySetting',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      payableDaysMode: {
        type: DataTypes.ENUM('calendar_month', 'every_30', 'every_28', 'every_26', 'exclude_weekly_offs'),
        allowNull: false,
        defaultValue: 'calendar_month',
      },
      weeklyOffs: { type: DataTypes.JSON, allowNull: true },
      hoursPerDay: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 8 },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'org_account_id' },
    },
    {
      tableName: 'salary_settings',
      underscored: true,
    }
  );

  return SalarySetting;
};
