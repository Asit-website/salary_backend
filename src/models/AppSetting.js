const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AppSetting = sequelize.define(
    'AppSetting',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      key: { type: DataTypes.STRING(64), allowNull: false },
      value: { type: DataTypes.TEXT, allowNull: true },
      orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'org_account_id' },
    },
    {
      tableName: 'app_settings',
      underscored: true,
      indexes: [
        { unique: true, fields: ['key', 'org_account_id'], name: 'unique_key_org' }
      ]
    }
  );

  return AppSetting;
};
