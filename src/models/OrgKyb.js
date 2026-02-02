const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OrgKyb = sequelize.define('OrgKyb', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    businessType: { type: DataTypes.STRING(64), allowNull: true, field: 'business_type' },
    gstin: { type: DataTypes.STRING(32), allowNull: true },
    businessName: { type: DataTypes.STRING(160), allowNull: true, field: 'business_name' },
    businessAddress: { type: DataTypes.TEXT, allowNull: true, field: 'business_address' },
    cin: { type: DataTypes.STRING(64), allowNull: true },
    directorName: { type: DataTypes.STRING(120), allowNull: true, field: 'director_name' },
    companyPan: { type: DataTypes.STRING(32), allowNull: true, field: 'company_pan' },
    bankAccountNumber: { type: DataTypes.STRING(64), allowNull: true, field: 'bank_account_number' },
    ifsc: { type: DataTypes.STRING(32), allowNull: true },
    // document file paths
    docCertificateIncorp: { type: DataTypes.STRING(255), allowNull: true, field: 'doc_certificate_incorp' },
    docCompanyPan: { type: DataTypes.STRING(255), allowNull: true, field: 'doc_company_pan' },
    docDirectorPan: { type: DataTypes.STRING(255), allowNull: true, field: 'doc_director_pan' },
    docCancelledCheque: { type: DataTypes.STRING(255), allowNull: true, field: 'doc_cancelled_cheque' },
    docDirectorId: { type: DataTypes.STRING(255), allowNull: true, field: 'doc_director_id' },
    docGstinCertificate: { type: DataTypes.STRING(255), allowNull: true, field: 'doc_gstin_certificate' },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'org_account_id' },
  }, {
    tableName: 'org_kyb',
    underscored: true,
    timestamps: true,
  });

  return OrgKyb;
};
