const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PayrollLine = sequelize.define(
    'PayrollLine',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      cycleId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      earnings: { type: DataTypes.JSON, allowNull: true },
      incentives: { type: DataTypes.JSON, allowNull: true },
      deductions: { type: DataTypes.JSON, allowNull: true },
      totals: { type: DataTypes.JSON, allowNull: true }, // { totalEarnings, totalDeductions, gross, net }
      attendanceSummary: { type: DataTypes.JSON, allowNull: true },
      adjustments: { type: DataTypes.JSON, allowNull: true, defaultValue: [] }, // [{type:'ADD'|'DEDUCT',label,amount}]
      remarks: { type: DataTypes.TEXT, allowNull: true },
      status: { type: DataTypes.ENUM('INCLUDED', 'EXCLUDED'), allowNull: false, defaultValue: 'INCLUDED' },
      paidAt: { type: DataTypes.DATE, allowNull: true },
      paidMode: { type: DataTypes.STRING(32), allowNull: true },
      paidRef: { type: DataTypes.STRING(191), allowNull: true },
      paidAmount: { type: DataTypes.DECIMAL(12,2), allowNull: true },
      paidBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    },
    { tableName: 'payroll_lines', underscored: true }
  );
  return PayrollLine;
};
