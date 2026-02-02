const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OrgBrand = sequelize.define('OrgBrand', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    displayName: { type: DataTypes.STRING(128), allowNull: false, field: 'display_name' },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'org_account_id' },
  }, {
    tableName: 'org_brands',
    underscored: true,
    timestamps: true,
  });

  return OrgBrand;
};
