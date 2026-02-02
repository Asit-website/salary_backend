const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PayrollCycle = sequelize.define(
    'PayrollCycle',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      monthKey: { type: DataTypes.STRING(7), allowNull: false }, // YYYY-MM
      status: { type: DataTypes.ENUM('DRAFT', 'LOCKED', 'PAID'), allowNull: false, defaultValue: 'DRAFT' },
      notes: { type: DataTypes.TEXT, allowNull: true },
      lockedAt: { type: DataTypes.DATE, allowNull: true },
      lockedBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      paidAt: { type: DataTypes.DATE, allowNull: true },
      paidBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'org_account_id' },
    },
    { tableName: 'payroll_cycles', underscored: true }
  );
  return PayrollCycle;
};
