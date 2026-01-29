const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const WeeklyOffTemplate = sequelize.define('WeeklyOffTemplate', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(128), allowNull: false },
    // JSON config: array of items { day: 0-6 (Sun=0), weeks: [1..5] | 'all' }
    config: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, { tableName: 'weekly_off_templates' });

  WeeklyOffTemplate.associate = (models) => {
    WeeklyOffTemplate.hasMany(models.StaffWeeklyOffAssignment, {
      as: 'assignments', foreignKey: 'weeklyOffTemplateId', onDelete: 'CASCADE'
    });
  };

  return WeeklyOffTemplate;
};
