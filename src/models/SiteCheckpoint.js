const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SiteCheckpoint = sequelize.define(
    'SiteCheckpoint',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      siteId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      name: { type: DataTypes.STRING(150), allowNull: false },
      qrCode: { type: DataTypes.STRING(100), allowNull: true },
      lat: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
      lng: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
      radiusM: { type: DataTypes.INTEGER, allowNull: true },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'site_checkpoints', underscored: true }
  );

  return SiteCheckpoint;
};
