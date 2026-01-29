const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PatrolLog = sequelize.define(
    'PatrolLog',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      siteId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      checkpointId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      checkInTime: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      lat: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
      lng: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
      photoUrl: { type: DataTypes.STRING(255), allowNull: true },
      signatureUrl: { type: DataTypes.STRING(255), allowNull: true },
      otp: { type: DataTypes.STRING(10), allowNull: true },
      supervisorVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      clientConfirmed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      penaltyAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      incentiveAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      penaltyReason: { type: DataTypes.STRING(255), allowNull: true },
    },
    { tableName: 'patrol_logs', underscored: true }
  );

  return PatrolLog;
};
