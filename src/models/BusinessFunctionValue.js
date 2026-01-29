const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BusinessFunctionValue = sequelize.define('BusinessFunctionValue', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    businessFunctionId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'business_function_id' },
    value: { type: DataTypes.STRING(128), allowNull: false },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: true, field: 'sort_order' },
  }, { tableName: 'business_function_values' });

  BusinessFunctionValue.associate = (models) => {
    BusinessFunctionValue.belongsTo(models.BusinessFunction, {
      foreignKey: 'businessFunctionId',
    });
  };

  return BusinessFunctionValue;
};
