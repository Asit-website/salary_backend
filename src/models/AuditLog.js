module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  const AuditLog = sequelize.define('AuditLog', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    userId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'user_id',
      references: { model: 'users', key: 'id' }
    },
    userPhone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'user_phone'
    },
    orgAccountId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'org_account_id',
      references: { model: 'org_accounts', key: 'id' }
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'ip_address'
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    performedBy: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'performed_by'
    },
    details: {
      type: DataTypes.JSON,
      allowNull: true
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at'
    }
  }, {
    tableName: 'audit_logs',
    underscored: true,
    indexes: [
      { fields: ['org_account_id'] },
      { fields: ['user_id'] },
      { fields: ['action'] },
      { fields: ['created_at'] }
    ]
  });

  return AuditLog;
};
