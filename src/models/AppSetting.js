const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AppSetting = sequelize.define(
    'AppSetting',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      key: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      value: { type: DataTypes.STRING(255), allowNull: false },
    },
    {
      tableName: 'app_settings',
      underscored: true,
    }
  );

  return AppSetting;
};
