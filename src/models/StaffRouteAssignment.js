const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StaffRouteAssignment = sequelize.define(
    'StaffRouteAssignment',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      routeId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      effectiveDate: { type: DataTypes.DATEONLY, allowNull: false },
    },
    { tableName: 'staff_route_assignments', underscored: true }
  );

  return StaffRouteAssignment;
};
