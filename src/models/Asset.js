module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  const Asset = sequelize.define('Asset', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    orgId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    name: { type: DataTypes.STRING(255), allowNull: false },
    category: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    serialNumber: { type: DataTypes.STRING(100), allowNull: true, unique: true },
    model: { type: DataTypes.STRING(100), allowNull: true },
    brand: { type: DataTypes.STRING(100), allowNull: true },
    purchaseDate: { type: DataTypes.DATEONLY, allowNull: true },
    purchaseCost: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    currentValue: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    location: { type: DataTypes.STRING(255), allowNull: true },
    condition: { type: DataTypes.ENUM('excellent', 'good', 'fair', 'poor'), allowNull: false, defaultValue: 'good' },
    status: { type: DataTypes.ENUM('available', 'in_use', 'maintenance', 'retired', 'lost'), allowNull: false, defaultValue: 'available' },
    assignedTo: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    assignedDate: { type: DataTypes.DATE, allowNull: true },
    warrantyExpiry: { type: DataTypes.DATEONLY, allowNull: true },
    lastMaintenanceDate: { type: DataTypes.DATEONLY, allowNull: true },
    nextMaintenanceDate: { type: DataTypes.DATEONLY, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    attachments: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
    createdBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    updatedBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  }, { 
    tableName: 'assets', 
    timestamps: true,
    indexes: [
      { fields: ['orgId'] },
      { fields: ['category'] },
      { fields: ['status'] },
      { fields: ['assignedTo'] },
      { fields: ['serialNumber'] },
    ]
  });
  return Asset;
};
