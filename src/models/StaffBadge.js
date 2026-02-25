const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StaffBadge = sequelize.define('StaffBadge', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    orgAccountId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'org_account_id',
    },
    userId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'user_id',
    },
    badgeId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'badge_id',
    },
    assignedById: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'assigned_by_id',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    assignedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'assigned_at',
    },
  }, {
    tableName: 'staff_badges',
    underscored: true,
  });

  return StaffBadge;
};

