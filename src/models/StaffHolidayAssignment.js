const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StaffHolidayAssignment = sequelize.define('StaffHolidayAssignment', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    holidayTemplateId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    effectiveFrom: { type: DataTypes.DATEONLY, allowNull: false },
    effectiveTo: { type: DataTypes.DATEONLY, allowNull: true },
  }, { tableName: 'staff_holiday_assignments' });

  StaffHolidayAssignment.associate = (models) => {
    StaffHolidayAssignment.belongsTo(models.User, { as: 'user', foreignKey: 'userId' });
    StaffHolidayAssignment.belongsTo(models.HolidayTemplate, { as: 'template', foreignKey: 'holidayTemplateId' });
  };

  return StaffHolidayAssignment;
};
