const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ShiftBreak = sequelize.define(
    'ShiftBreak',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      shiftTemplateId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      category: { type: DataTypes.STRING(50), allowNull: true },
      name: { type: DataTypes.STRING(150), allowNull: true },
      payType: { type: DataTypes.ENUM('paid', 'unpaid'), allowNull: false, defaultValue: 'unpaid' },
      breakType: { type: DataTypes.ENUM('duration', 'fixed_window'), allowNull: false, defaultValue: 'duration' },
      durationMinutes: { type: DataTypes.INTEGER, allowNull: true },
      startTime: { type: DataTypes.TIME, allowNull: true },
      endTime: { type: DataTypes.TIME, allowNull: true },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: 'shift_breaks',
      underscored: true,
    }
  );

  return ShiftBreak;
};
