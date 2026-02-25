const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Badge = sequelize.define('Badge', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    orgAccountId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'org_account_id',
    },
    name: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    createdById: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'created_by_id',
    },
    updatedById: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'updated_by_id',
    },
  }, {
    tableName: 'badges',
    underscored: true,
  });

  return Badge;
};

