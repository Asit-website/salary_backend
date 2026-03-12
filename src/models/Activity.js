const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Activity = sequelize.define('Activity', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    title: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    remarks: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM('SCHEDULE', 'IN_PROGRESS', 'REVIEW', 'DONE'),
      allowNull: false,
      defaultValue: 'SCHEDULE'
    },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    turnAroundTime: { type: DataTypes.STRING(50), allowNull: true },
  }, {
    tableName: 'activities',
    underscored: true,
    timestamps: true,
  });

  return Activity;
};
