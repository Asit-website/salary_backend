module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  const AssetMaintenance = sequelize.define('AssetMaintenance', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    assetId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    maintenanceType: { type: DataTypes.ENUM('preventive', 'corrective', 'emergency'), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    scheduledDate: { type: DataTypes.DATEONLY, allowNull: false },
    completedDate: { type: DataTypes.DATEONLY, allowNull: true },
    cost: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    vendor: { type: DataTypes.STRING(255), allowNull: true },
    performedBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    status: { type: DataTypes.ENUM('scheduled', 'in_progress', 'completed', 'cancelled'), allowNull: false, defaultValue: 'scheduled' },
    notes: { type: DataTypes.TEXT, allowNull: true },
    attachments: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
    createdBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    updatedBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  }, { 
    tableName: 'asset_maintenance', 
    timestamps: true,
    indexes: [
      { fields: ['assetId'] },
      { fields: ['maintenanceType'] },
      { fields: ['status'] },
      { fields: ['scheduledDate'] },
      { fields: ['performedBy'] },
    ]
  });
  return AssetMaintenance;
};
