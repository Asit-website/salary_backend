const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SalesTarget = sequelize.define(
    'SalesTarget',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      staffUserId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      period: { type: DataTypes.ENUM('daily', 'weekly', 'monthly'), allowNull: false },
      periodDate: { type: DataTypes.DATEONLY, allowNull: false },
      targetAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      targetOrders: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    },
    { tableName: 'sales_targets', underscored: true }
  );

  return SalesTarget;
};
