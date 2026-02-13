 module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  const AIAnomaly = sequelize.define('AIAnomaly', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    type: { type: DataTypes.STRING(50), allowNull: false },  
    severity: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'medium' },
    details: { type: DataTypes.JSON, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'ai_anomalies',
    underscored: true,
  });
  return AIAnomaly;
};
