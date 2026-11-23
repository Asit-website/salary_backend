const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Activity = sequelize.define('Activity', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    title: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    remarks: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM('SCHEDULE', 'IN_PROGRESS', 'REVIEW', 'DONE'),
      allowNull: false,
      defaultValue: 'SCHEDULE'
    },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    turnAroundTime: { type: DataTypes.STRING(50), allowNull: true },
    turnAroundDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'turn_around_date' },
    isClosed: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_closed' },
    closedById: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'closed_by_id' },
    transferredToId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'transferred_to_id' },
    allocatedById: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'allocated_by_id' },
    jobType: { type: DataTypes.STRING(50), defaultValue: 'ROUTINE', field: 'job_type' },
    dayRule: { type: DataTypes.STRING(50), defaultValue: 'ALL_DAYS', field: 'day_rule' },
    batchId: { type: DataTypes.STRING(100), allowNull: true, field: 'batch_id' },
  }, {
    tableName: 'activities',
    underscored: true,
    timestamps: true,
  });

  return Activity;
};
