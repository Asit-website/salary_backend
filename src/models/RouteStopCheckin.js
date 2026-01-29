const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RouteStopCheckin = sequelize.define(
    'RouteStopCheckin',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      routeId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      routeStopId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      checkInTime: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      lat: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
      lng: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
      photoUrl: { type: DataTypes.STRING(255), allowNull: true },
      signatureUrl: { type: DataTypes.STRING(255), allowNull: true },
      otp: { type: DataTypes.STRING(10), allowNull: true },
      verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    { tableName: 'route_stop_checkins', underscored: true }
  );

  return RouteStopCheckin;
};
