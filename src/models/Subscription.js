const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Subscription = sequelize.define(
    'Subscription',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'org_account_id' },
      planId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'plan_id' },
      startAt: { type: DataTypes.DATE, allowNull: false },
      endAt: { type: DataTypes.DATE, allowNull: false },
      status: { type: DataTypes.ENUM('ACTIVE','EXPIRED','CANCELED'), allowNull: false, defaultValue: 'ACTIVE' },
      meta: { type: DataTypes.JSON, allowNull: true },
      staffLimit: { type: DataTypes.INTEGER, allowNull: true, field: 'staff_limit' },
    },
    { tableName: 'subscriptions', underscored: true }
  );

  return Subscription;
};
