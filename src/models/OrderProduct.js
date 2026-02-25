const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OrderProduct = sequelize.define('OrderProduct', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    orgAccountId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'org_account_id',
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    size: {
      type: DataTypes.STRING(60),
      allowNull: true,
    },
    defaultQty: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
      field: 'default_qty',
    },
    defaultPrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'default_price',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    sortOrder: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      field: 'sort_order',
    },
    createdById: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'created_by_id',
    },
    updatedById: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'updated_by_id',
    },
  }, {
    tableName: 'order_products',
    underscored: true,
  });

  return OrderProduct;
};
