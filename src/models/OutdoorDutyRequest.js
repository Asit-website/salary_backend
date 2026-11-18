const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OutdoorDutyRequest = sequelize.define('OutdoorDutyRequest', {
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
    groupId: {
      type: DataTypes.STRING(64),
      allowNull: false,
      field: 'group_id',
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    fromTime: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'from_time',
    },
    toTime: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'to_time',
    },
    reason: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    visitLocation: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'visit_location',
    },
    clientName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'client_name',
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    attachmentUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'attachment_url',
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
      allowNull: false,
      defaultValue: 'PENDING',
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
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'rejection_reason',
    },
  }, {
    tableName: 'outdoor_duty_requests',
    timestamps: true,
    underscored: true,
  });

  return OutdoorDutyRequest;
};
