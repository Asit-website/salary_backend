module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  const GeofenceTemplate = sequelize.define('GeofenceTemplate', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(128), allowNull: false },
    approvalRequired: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'approval_required' },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'org_account_id' },
  }, { tableName: 'geofence_templates', timestamps: true });
  return GeofenceTemplate;
};
