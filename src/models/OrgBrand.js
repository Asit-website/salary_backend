const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OrgBrand = sequelize.define('OrgBrand', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    displayName: { type: DataTypes.STRING(128), allowNull: false, field: 'display_name' },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, {
    tableName: 'org_brands',
    underscored: true,
    timestamps: true,
  });

  return OrgBrand;
};
