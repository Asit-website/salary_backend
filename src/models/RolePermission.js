const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RolePermission = sequelize.define('RolePermission', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    roleId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'role_id' },
    permissionId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'permission_id' },
  }, {
    tableName: 'role_permissions',
    underscored: true,
  });

  return RolePermission;
};
