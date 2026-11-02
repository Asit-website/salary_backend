const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LatePunchApproval = sequelize.define('LatePunchApproval', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    orgAccountId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'org_account_id',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    shiftStartTime: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'shift_start_time',
    },
    punchedInAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'punched_in_at',
    },
    lateMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'late_minutes',
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    adminRemarks: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'admin_remarks',
    },
    reviewedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'reviewed_by',
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'reviewed_at',
    },
  }, {
    tableName: 'late_punch_approvals',
    timestamps: true,
    underscored: true,
  });

  return LatePunchApproval;
};
