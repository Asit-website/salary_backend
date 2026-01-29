const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StaffLeaveAssignment = sequelize.define(
    'StaffLeaveAssignment',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      leaveTemplateId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      effectiveFrom: { type: DataTypes.DATEONLY, allowNull: false },
      effectiveTo: { type: DataTypes.DATEONLY, allowNull: true },
    },
    { tableName: 'staff_leave_assignments', underscored: true }
  );

  return StaffLeaveAssignment;
};
