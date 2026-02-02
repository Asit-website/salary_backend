const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SalesVisit = sequelize.define(
    'SalesVisit',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      visitDate: { type: DataTypes.DATE, allowNull: false },
      salesPerson: { type: DataTypes.STRING(150), allowNull: true },
      visitType: { type: DataTypes.STRING(50), allowNull: true },
      clientName: { type: DataTypes.STRING(150), allowNull: true },
      phone: { type: DataTypes.STRING(30), allowNull: true },
      clientType: { type: DataTypes.STRING(50), allowNull: true },
      location: { type: DataTypes.STRING(255), allowNull: true },
      madeOrder: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      clientSignatureUrl: { type: DataTypes.STRING(255), allowNull: true },
      clientOtp: { type: DataTypes.STRING(10), allowNull: true },
      checkInLat: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
      checkInLng: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
      checkInTime: { type: DataTypes.DATE, allowNull: true },
      verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'org_account_id' },
    },
    { tableName: 'sales_visits', underscored: true }
  );

  return SalesVisit;
};
