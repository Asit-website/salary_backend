const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OrgBusinessInfo = sequelize.define('OrgBusinessInfo', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    state: { type: DataTypes.STRING(120), allowNull: true },
    city: { type: DataTypes.STRING(120), allowNull: true },
    addressLine1: { type: DataTypes.TEXT, allowNull: true, field: 'address_line1' },
    addressLine2: { type: DataTypes.TEXT, allowNull: true, field: 'address_line2' },
    pincode: { type: DataTypes.STRING(16), allowNull: true },
    logoUrl: { type: DataTypes.STRING(255), allowNull: true, field: 'logo_url' },
    sidebarHeaderType: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'name', field: 'sidebar_header_type' },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'org_account_id' },
  }, {
    tableName: 'org_business_info',
    underscored: true,
    timestamps: true,
  });

  return OrgBusinessInfo;
};
