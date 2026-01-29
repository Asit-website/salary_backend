module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  const GeofenceSite = sequelize.define('GeofenceSite', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    geofenceTemplateId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'geofence_template_id' },
    name: { type: DataTypes.STRING(128), allowNull: false },
    address: { type: DataTypes.STRING(512), allowNull: true },
    latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: false },
    longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: false },
    radiusMeters: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 100, field: 'radius_meters' },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, { tableName: 'geofence_sites', timestamps: true });
  return GeofenceSite;
};
