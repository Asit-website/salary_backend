module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  const SalaryForecast = sequelize.define('SalaryForecast', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    month: { type: DataTypes.INTEGER, allowNull: false }, // 1-12
    year: { type: DataTypes.INTEGER, allowNull: false },
    forecastNetPay: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
    assumptions: { type: DataTypes.JSON, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'salary_forecasts',
    underscored: true,
    indexes: [
      { unique: true, fields: ['user_id','month','year'] }
    ],
  });
  return SalaryForecast;
};
