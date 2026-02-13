const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserRole = sequelize.define('UserRole', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'user_id' },
    roleId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'role_id' },
  }, {
    tableName: 'user_roles',
    underscored: true,
  });

  return UserRole;
};
