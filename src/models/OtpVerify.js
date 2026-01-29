          module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  const OtpVerify = sequelize.define('OtpVerify', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    phone: { type: DataTypes.STRING(20), allowNull: false },
    code: { type: DataTypes.STRING(12), allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    consumedAt: { type: DataTypes.DATE, allowNull: true },
    lastSentAt: { type: DataTypes.DATE, allowNull: false },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'otp_verifies',
    indexes: [
      { fields: ['phone'] },
      { fields: ['expiresAt'] },
    ],
  });
  return OtpVerify;
};
