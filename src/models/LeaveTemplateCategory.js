const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LeaveTemplateCategory = sequelize.define(
    'LeaveTemplateCategory',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      leaveTemplateId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      key: { type: DataTypes.STRING(50), allowNull: false },
      name: { type: DataTypes.STRING(150), allowNull: false },
      leaveCount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      unusedRule: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'lapse' },
      carryLimitDays: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      encashLimitDays: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    },
    { tableName: 'leave_template_categories', underscored: true }
  );

  return LeaveTemplateCategory;
};
