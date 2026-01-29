const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ShiftRotationalSlot = sequelize.define(
    'ShiftRotationalSlot',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      shiftTemplateId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      name: { type: DataTypes.STRING(150), allowNull: true },
      startTime: { type: DataTypes.TIME, allowNull: false },
      endTime: { type: DataTypes.TIME, allowNull: false },
      unpaidBreakMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'shift_rotational_slots', underscored: true }
  );
  return ShiftRotationalSlot;
};
