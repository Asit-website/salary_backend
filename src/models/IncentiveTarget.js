const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const IncentiveTarget = sequelize.define(
    'IncentiveTarget',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      staffUserId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      period: { type: DataTypes.ENUM('daily', 'weekly', 'monthly'), allowNull: false },
      periodDate: { type: DataTypes.DATEONLY, allowNull: false },
      ordersThreshold: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      rewardAmount: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
      title: { type: DataTypes.STRING(120), allowNull: true },
      note: { type: DataTypes.STRING(255), allowNull: true },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'org_account_id' },
    },
    { tableName: 'incentive_targets', underscored: true }
  );

  return IncentiveTarget;
};
