const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OrderItem = sequelize.define(
    'OrderItem',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      orderId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      name: { type: DataTypes.STRING(150), allowNull: false },
      size: { type: DataTypes.STRING(50), allowNull: true },
      qty: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      price: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
      amount: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
      meta: { type: DataTypes.JSON, allowNull: true },
    },
    { tableName: 'order_items', underscored: true }
  );

  return OrderItem;
};
