const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ShiftTemplate = sequelize.define(
    'ShiftTemplate',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      shiftType: { type: DataTypes.ENUM('fixed', 'open', 'rotational'), allowNull: false, defaultValue: 'fixed' },
      name: { type: DataTypes.STRING(150), allowNull: false },
      code: { type: DataTypes.STRING(50), allowNull: true, unique: true },
      startTime: { type: DataTypes.TIME, allowNull: true },
      endTime: { type: DataTypes.TIME, allowNull: true },
      workMinutes: { type: DataTypes.INTEGER, allowNull: true },
      bufferMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      earliestPunchInTime: { type: DataTypes.TIME, allowNull: true },
      latestPunchOutTime: { type: DataTypes.TIME, allowNull: true },
      // Relative window from punch-in when punch-out is permitted
      minPunchOutAfterMinutes: { type: DataTypes.INTEGER, allowNull: true },
      maxPunchOutAfterMinutes: { type: DataTypes.INTEGER, allowNull: true },
      enableMultipleShifts: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: 'shift_templates',
      underscored: true,
    }
  );

  return ShiftTemplate;
};
