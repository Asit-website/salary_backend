const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Plan = sequelize.define(
    'Plan',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      code: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(120), allowNull: false },
      periodDays: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      staffLimit: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 10 },
      price: { type: DataTypes.DECIMAL(10,2), allowNull: false, defaultValue: 0 },
      features: { type: DataTypes.JSON, allowNull: true },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'plans', underscored: true }
  );

  return Plan;
};
