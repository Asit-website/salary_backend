module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  const AssetAssignment = sequelize.define('AssetAssignment', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    assetId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    assignedTo: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    assignedBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    assignedDate: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    returnedDate: { type: DataTypes.DATE, allowNull: true },
    status: { type: DataTypes.ENUM('active', 'returned'), allowNull: false, defaultValue: 'active' },
    notes: { type: DataTypes.TEXT, allowNull: true },
    conditionAtAssignment: { type: DataTypes.ENUM('excellent', 'good', 'fair', 'poor'), allowNull: false },
    conditionAtReturn: { type: DataTypes.ENUM('excellent', 'good', 'fair', 'poor'), allowNull: true },
  }, { 
    tableName: 'asset_assignments', 
    timestamps: true,
    indexes: [
      { fields: ['assetId'] },
      { fields: ['assignedTo'] },
      { fields: ['assignedBy'] },
      { fields: ['status'] },
      { fields: ['assignedDate'] },
    ]
  });
  return AssetAssignment;
};
