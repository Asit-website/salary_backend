module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  const LocationPing = sequelize.define('LocationPing', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'user_id' },
    latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: false },
    longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: false },
    accuracyMeters: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'accuracy_meters' },
    source: { type: DataTypes.STRING(32), allowNull: true },
  }, { tableName: 'location_pings', timestamps: true });
  return LocationPing;
};
