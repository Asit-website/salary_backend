const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const HolidayDate = sequelize.define('HolidayDate', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    holidayTemplateId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    name: { type: DataTypes.STRING(128), allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { tableName: 'holiday_dates' });

  HolidayDate.associate = (models) => {
    HolidayDate.belongsTo(models.HolidayTemplate, { as: 'template', foreignKey: 'holidayTemplateId' });
  };

  return HolidayDate;
};
