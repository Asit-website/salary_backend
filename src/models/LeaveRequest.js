const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LeaveRequest = sequelize.define(
    'LeaveRequest',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      startDate: { type: DataTypes.DATEONLY, allowNull: false },
      endDate: { type: DataTypes.DATEONLY, allowNull: false },
      leaveType: { type: DataTypes.STRING(32), allowNull: false },
      categoryKey: { type: DataTypes.STRING(50), allowNull: true },
      days: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      paidDays: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      unpaidDays: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      reason: { type: DataTypes.STRING(500), allowNull: true },
      status: { type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'), allowNull: false, defaultValue: 'PENDING' },
      approvalLevelRequired: { type: DataTypes.INTEGER, allowNull: true },
      approvalLevelDone: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      reviewedBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      reviewedAt: { type: DataTypes.DATE, allowNull: true },
      reviewNote: { type: DataTypes.STRING(500), allowNull: true },
      orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'org_account_id' },
    },
    {
      tableName: 'leave_requests',
      underscored: true,
      indexes: [{ fields: ['user_id', 'status'] }],
    }
  );

  return LeaveRequest;
};
