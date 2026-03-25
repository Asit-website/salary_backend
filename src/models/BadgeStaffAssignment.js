const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BadgeStaffAssignment = sequelize.define('BadgeStaffAssignment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    orgAccountId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    badgeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    staffUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    tableName: 'badge_staff_assignments',
    timestamps: true,
  });

  return BadgeStaffAssignment;
};
