const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StaffHolidayWorkPayAssignment = sequelize.define('StaffHolidayWorkPayAssignment', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    ruleId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    effectiveFrom: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    effectiveTo: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    orgAccountId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    }
  }, {
    tableName: 'staff_holiday_work_pay_assignments',
    underscored: true,
    timestamps: true,
  });

  return StaffHolidayWorkPayAssignment;
};
