 module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  const AIAnomaly = sequelize.define('AIAnomaly', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    orgAccountId: { type: DataTypes.INTEGER, allowNull: false },
    month: { type: DataTypes.INTEGER, allowNull: true },
    year: { type: DataTypes.INTEGER, allowNull: true },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    type: { type: DataTypes.STRING(50), allowNull: false },  
    severity: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'medium' },
    message: { type: DataTypes.TEXT, allowNull: true },
    categories: { type: DataTypes.JSON, allowNull: true },
    details: { type: DataTypes.JSON, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'ai_anomalies',
    underscored: true,
    indexes: [
      { fields: ['org_account_id'] },
      { fields: ['user_id', 'month', 'year'] }
    ]
  });
  return AIAnomaly;
};
