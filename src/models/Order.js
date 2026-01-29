const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Order = sequelize.define(
    'Order',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      clientId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      assignedJobId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      orderDate: { type: DataTypes.DATE, allowNull: false },
      paymentMethod: { type: DataTypes.STRING(20), allowNull: true },
      remarks: { type: DataTypes.TEXT, allowNull: true },
      proofUrl: { type: DataTypes.STRING(255), allowNull: true },
      netAmount: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
      gstAmount: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
      totalAmount: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
      meta: { type: DataTypes.JSON, allowNull: true },
    },
    { tableName: 'orders', underscored: true }
  );

  return Order;
};
