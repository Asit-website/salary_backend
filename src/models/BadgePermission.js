const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BadgePermission = sequelize.define('BadgePermission', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    orgAccountId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'org_account_id',
    },
    badgeId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'badge_id',
    },
    permissionKey: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'permission_key',
    },
    permissionLabel: {
      type: DataTypes.STRING(120),
      allowNull: false,
      field: 'permission_label',
    },
  }, {
    tableName: 'badge_permissions',
    underscored: true,
  });

  return BadgePermission;
};

