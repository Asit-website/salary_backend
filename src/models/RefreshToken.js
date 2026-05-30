const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RefreshToken = sequelize.define(
    'RefreshToken',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      token: { type: DataTypes.STRING(255), allowNull: false, unique: true },
      userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'user_id' },
      expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' },
      ipAddress: { type: DataTypes.STRING(45), allowNull: true, field: 'ip_address' },
      userAgent: { type: DataTypes.STRING(500), allowNull: true, field: 'user_agent' },
      deviceFingerprint: { type: DataTypes.STRING(255), allowNull: true, field: 'device_fingerprint' },
      lastActivityAt: { type: DataTypes.DATE, allowNull: true, field: 'last_activity_at' },
    },
    {
      tableName: 'refresh_tokens',
      underscored: true,
    }
  );

  return RefreshToken;
};
