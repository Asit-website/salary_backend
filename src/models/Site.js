const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Site = sequelize.define(
    'Site',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(150), allowNull: false },
      address: { type: DataTypes.STRING(255), allowNull: true },
      lat: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
      lng: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
      geofenceRadiusM: { type: DataTypes.INTEGER, allowNull: true },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'org_account_id' },
    },
    { tableName: 'sites', underscored: true }
  );

  return Site;
};
