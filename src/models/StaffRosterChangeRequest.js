const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StaffRosterChangeRequest = sequelize.define(
    'StaffRosterChangeRequest',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'user_id' },
      date: { type: DataTypes.DATEONLY, allowNull: false },
      currentShiftTemplateId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'current_shift_template_id' },
      requestedShiftTemplateId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'requested_shift_template_id' },
      requestedStatus: {
        type: DataTypes.ENUM('SHIFT', 'WEEKLY_OFF'),
        allowNull: false,
        defaultValue: 'SHIFT',
        field: 'requested_status'
      },
      reason: { type: DataTypes.TEXT, allowNull: false },
      status: {
        type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
        allowNull: false,
        defaultValue: 'PENDING'
      },
      adminRemarks: { type: DataTypes.STRING(500), allowNull: true, field: 'admin_remarks' },
      reviewedBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'reviewed_by' },
      reviewedAt: { type: DataTypes.DATE, allowNull: true, field: 'reviewed_at' },
      orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'org_account_id' },
    },
    {
      tableName: 'staff_roster_change_requests',
      underscored: true,
      indexes: [
        { fields: ['user_id', 'date'] },
        { fields: ['org_account_id'] },
        { fields: ['status'] }
      ]
    }
  );

  return StaffRosterChangeRequest;
};
