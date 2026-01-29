module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  const StaffGeofenceAssignment = sequelize.define('StaffGeofenceAssignment', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'user_id' },
    geofenceTemplateId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'geofence_template_id' },
    effectiveFrom: { type: DataTypes.DATEONLY, allowNull: true, field: 'effective_from' },
    effectiveTo: { type: DataTypes.DATEONLY, allowNull: true, field: 'effective_to' },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, { tableName: 'staff_geofence_assignments', timestamps: true });
  return StaffGeofenceAssignment;
};
