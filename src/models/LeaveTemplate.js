const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LeaveTemplate = sequelize.define(
    'LeaveTemplate',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(150), allowNull: false },
      cycle: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'monthly' },
      cycleStartDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'cycle_start_date' },
      cycleStartDay: { type: DataTypes.INTEGER, allowNull: true, field: 'cycle_start_day', defaultValue: 1 },
      countSandwich: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      approvalLevel: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'org_account_id' },
    },
    { tableName: 'leave_templates', underscored: true }
  );

  return LeaveTemplate;
};
