const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OrgAddonSetting = sequelize.define(
    'OrgAddonSetting',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      orgAccountId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'org_account_id',
        unique: true,
      },
      enableMultiplePunches: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'enable_multiple_punches',
      },
      allowSplitShifts: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'allow_split_shifts',
      },
      maxDailyPunches: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 4,
        field: 'max_daily_punches',
      },
    },
    {
      tableName: 'org_addon_settings',
      underscored: true,
    }
  );

  return OrgAddonSetting;
};
