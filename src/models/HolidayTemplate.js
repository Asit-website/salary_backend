const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const HolidayTemplate = sequelize.define('HolidayTemplate', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(128), allowNull: false },
    startMonth: { type: DataTypes.INTEGER, allowNull: true },
    endMonth: { type: DataTypes.INTEGER, allowNull: true },
    active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { tableName: 'holiday_templates' });

  HolidayTemplate.associate = (models) => {
    HolidayTemplate.hasMany(models.HolidayDate, { as: 'holidays', foreignKey: 'holidayTemplateId', onDelete: 'CASCADE' });
    HolidayTemplate.hasMany(models.StaffHolidayAssignment, { as: 'assignments', foreignKey: 'holidayTemplateId', onDelete: 'CASCADE' });
  };

  return HolidayTemplate;
};
