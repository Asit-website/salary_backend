const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DeviceInfo = sequelize.define('DeviceInfo', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    orgAccountId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'org_account_id',
    },
    userId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'user_id',
    },
    deviceId: {
      type: DataTypes.STRING(128),
      allowNull: false,
      field: 'device_id',
    },
    brand: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    model: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    platform: {
      type: DataTypes.STRING(40),
      allowNull: true,
    },
    osVersion: {
      type: DataTypes.STRING(60),
      allowNull: true,
      field: 'os_version',
    },
    appVersion: {
      type: DataTypes.STRING(40),
      allowNull: true,
      field: 'app_version',
    },
    userAgent: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'user_agent',
    },
    lastSeenAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'last_seen_at',
      defaultValue: DataTypes.NOW,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      field: 'is_active',
      defaultValue: true,
    },
  }, {
    tableName: 'device_infos',
    underscored: true,
  });

  return DeviceInfo;
};

