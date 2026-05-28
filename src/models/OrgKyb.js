const { DataTypes } = require('sequelize');
const { encrypt, decrypt } = require('../utils/encryption');

module.exports = (sequelize) => {
  const OrgKyb = sequelize.define('OrgKyb', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    businessType: { type: DataTypes.STRING(64), allowNull: true },
    gstin: { type: DataTypes.STRING(32), allowNull: true },
    businessName: { type: DataTypes.STRING(160), allowNull: true },
    businessAddress: { type: DataTypes.TEXT, allowNull: true },
    cin: { type: DataTypes.STRING(64), allowNull: true },
    directorName: { type: DataTypes.STRING(120), allowNull: true },
    companyPan: {
      type: DataTypes.STRING(255),
      allowNull: true,
      get() {
        return decrypt(this.getDataValue('companyPan'), 'string');
      },
      set(value) {
        this.setDataValue('companyPan', encrypt(value));
      }
    },
    bankAccountNumber: {
      type: DataTypes.STRING(255),
      allowNull: true,
      get() {
        return decrypt(this.getDataValue('bankAccountNumber'), 'string');
      },
      set(value) {
        this.setDataValue('bankAccountNumber', encrypt(value));
      }
    },
    ifsc: {
      type: DataTypes.STRING(255),
      allowNull: true,
      get() {
        return decrypt(this.getDataValue('ifsc'), 'string');
      },
      set(value) {
        this.setDataValue('ifsc', encrypt(value));
      }
    },
    // document file paths
    docCertificateIncorp: { type: DataTypes.STRING(255), allowNull: true },
    docCompanyPan: { type: DataTypes.STRING(255), allowNull: true },
    docDirectorPan: { type: DataTypes.STRING(255), allowNull: true },
    docCancelledCheque: { type: DataTypes.STRING(255), allowNull: true },
    docDirectorId: { type: DataTypes.STRING(255), allowNull: true },
    docGstinCertificate: { type: DataTypes.STRING(255), allowNull: true },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  }, {
    tableName: 'org_kyb',
    timestamps: true,
  });

  return OrgKyb;
};
