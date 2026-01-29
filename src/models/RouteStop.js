const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RouteStop = sequelize.define(
    'RouteStop',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      routeId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      seqNo: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING(150), allowNull: false },
      lat: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
      lng: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
      radiusM: { type: DataTypes.INTEGER, allowNull: true },
      plannedTime: { type: DataTypes.TIME, allowNull: true },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'route_stops', underscored: true }
  );

  return RouteStop;
};
