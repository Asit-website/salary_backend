module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  const ReliabilityScore = sequelize.define('ReliabilityScore', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    month: { type: DataTypes.INTEGER, allowNull: false }, // 1-12
    year: { type: DataTypes.INTEGER, allowNull: false },
    score: { type: DataTypes.DECIMAL(10,2), allowNull: false, defaultValue: 0 },
    breakdown: { type: DataTypes.JSON, allowNull: true }, // { attendanceConsistency, punctuality, tasks, locationAccuracy }
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'reliability_scores',
    underscored: true,
    indexes: [
      { unique: true, fields: ['user_id','month','year'] }
    ],
  });
  return ReliabilityScore;
};
