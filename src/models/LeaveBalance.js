const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LeaveBalance = sequelize.define(
    'LeaveBalance',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      categoryKey: { type: DataTypes.STRING(50), allowNull: false },
      cycleStart: { type: DataTypes.DATEONLY, allowNull: false },
      cycleEnd: { type: DataTypes.DATEONLY, allowNull: false },
      allocated: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      carriedForward: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      used: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      encashed: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      remaining: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    },
    { tableName: 'leave_balances', underscored: true }
  );

  return LeaveBalance;
};
