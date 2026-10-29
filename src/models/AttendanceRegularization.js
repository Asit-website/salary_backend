const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AttendanceRegularization = sequelize.define('AttendanceRegularization', {
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
    requestedInTime: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'requested_in_time',
    },
    requestedOutTime: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'requested_out_time',
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false,
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
    tableName: 'attendance_regularizations',
    timestamps: true,
    underscored: true,
  });

  return AttendanceRegularization;
};
