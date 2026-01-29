const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AttendanceTemplate = sequelize.define(
    'AttendanceTemplate',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(150), allowNull: false },
      code: { type: DataTypes.STRING(50), allowNull: true, unique: true },
      attendanceMode: { type: DataTypes.ENUM('mark_present_by_default', 'manual', 'location_based', 'selfie_location'), allowNull: false, defaultValue: 'manual' },
      holidaysRule: { type: DataTypes.ENUM('disallow', 'comp_off', 'allow'), allowNull: false, defaultValue: 'disallow' },
      trackInOutEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      requirePunchOut: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      allowMultiplePunches: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      markAbsentPrevDaysEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      markAbsentRule: { type: DataTypes.ENUM('rule1', 'rule2', 'rule3', 'rule4', 'none'), allowNull: false, defaultValue: 'none' },
      effectiveHoursRule: { type: DataTypes.STRING(50), allowNull: true },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: 'attendance_templates',
      underscored: true,
    }
  );

  return AttendanceTemplate;
};
