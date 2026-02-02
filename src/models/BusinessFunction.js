const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BusinessFunction = sequelize.define('BusinessFunction', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(128), allowNull: false },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'org_account_id' },
  }, { tableName: 'business_functions' });

  BusinessFunction.associate = (models) => {
    BusinessFunction.hasMany(models.BusinessFunctionValue, {
      as: 'values',
      foreignKey: 'businessFunctionId',
      onDelete: 'CASCADE',
    });
  };

  return BusinessFunction;
};
