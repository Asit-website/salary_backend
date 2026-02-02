const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AttendanceTemplate = sequelize.define(
    'AttendanceTemplate',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(150), allowNull: false },
      code: { type: DataTypes.STRING(50), allowNull: true },
      attendanceMode: { type: DataTypes.STRING(50), allowNull: true, defaultValue: 'manual' },
      holidaysRule: { type: DataTypes.STRING(50), allowNull: true, defaultValue: 'disallow' },
      trackInOutEnabled: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
      requirePunchOut: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
      allowMultiplePunches: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
      markAbsentPrevDaysEnabled: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
      markAbsentRule: { type: DataTypes.STRING(50), allowNull: true, defaultValue: 'none' },
      effectiveHoursRule: { type: DataTypes.STRING(50), allowNull: true },
      active: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: true },
      orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'org_account_id' },
    },
    {
      tableName: 'attendance_templates',
      underscored: true,
    }
  );

  return AttendanceTemplate;
};
