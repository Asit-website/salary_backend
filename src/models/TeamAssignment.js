const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TeamAssignment = sequelize.define('TeamAssignment', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    orgAccountId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    leaderUserId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    memberUserId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    teamName: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    tableName: 'team_assignments',
    timestamps: true,
    indexes: [
      { fields: ['orgAccountId', 'leaderUserId'] },
      { fields: ['orgAccountId', 'memberUserId'] },
    ],
  });

  return TeamAssignment;
};
