const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StaffOrderProduct = sequelize.define('StaffOrderProduct', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    orgAccountId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'org_account_id',
    },
    userId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'user_id',
    },
    orderProductId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'order_product_id',
    },
    assignedById: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'assigned_by_id',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    assignedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'assigned_at',
    },
  }, {
    tableName: 'staff_order_products',
    underscored: true,
  });

  return StaffOrderProduct;
};
