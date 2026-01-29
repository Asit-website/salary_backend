const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StaffAttendanceAssignment = sequelize.define(
    'StaffAttendanceAssignment',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      attendanceTemplateId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      effectiveFrom: { type: DataTypes.DATEONLY, allowNull: false },
      effectiveTo: { type: DataTypes.DATEONLY, allowNull: true },
    },
    {
      tableName: 'staff_attendance_assignments',
      underscored: true,
      indexes: [{ unique: true, fields: ['user_id', 'effective_from'] }],
    }
  );

  return StaffAttendanceAssignment;
};
