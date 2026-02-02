const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OrgAccount = sequelize.define(
    'OrgAccount',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(150), allowNull: false },
      phone: { type: DataTypes.STRING(30), allowNull: true },
      businessEmail: { type: DataTypes.STRING(150), allowNull: true },
      state: { type: DataTypes.STRING(100), allowNull: true },
      city: { type: DataTypes.STRING(100), allowNull: true },
      channelPartnerId: { type: DataTypes.STRING(100), allowNull: true },
      roleDescription: { type: DataTypes.TEXT, allowNull: true },
      employeeCount: { type: DataTypes.STRING(50), allowNull: true },
      clientType: { type: DataTypes.STRING(50), allowNull: true },
      location: { type: DataTypes.STRING(255), allowNull: true },
      extra: { type: DataTypes.JSON, allowNull: true },
      status: { type: DataTypes.ENUM('ACTIVE', 'DISABLED', 'SUSPENDED'), allowNull: false, defaultValue: 'ACTIVE' },
      createdBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    },
    { tableName: 'org_accounts', underscored: true }
  );

  return OrgAccount;
};
