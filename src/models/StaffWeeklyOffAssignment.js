const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StaffWeeklyOffAssignment = sequelize.define('StaffWeeklyOffAssignment', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'user_id' },
    weeklyOffTemplateId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'weekly_off_template_id' },
    effectiveFrom: { type: DataTypes.DATEONLY, allowNull: false, field: 'effective_from' },
    effectiveTo: { type: DataTypes.DATEONLY, allowNull: true, field: 'effective_to' },
  }, { tableName: 'staff_weekly_off_assignments' });

  StaffWeeklyOffAssignment.associate = (models) => {
    StaffWeeklyOffAssignment.belongsTo(models.WeeklyOffTemplate, { foreignKey: 'weeklyOffTemplateId', as: 'template' });
    StaffWeeklyOffAssignment.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return StaffWeeklyOffAssignment;
};
