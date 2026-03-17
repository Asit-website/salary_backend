const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Meeting = sequelize.define('Meeting', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    createdBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    title: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    meetLink: { type: DataTypes.STRING(512), allowNull: true },
    scheduledAt: { type: DataTypes.DATE, allowNull: false },
    status: {
      type: DataTypes.ENUM('SCHEDULE', 'IN_PROGRESS', 'DONE'),
      allowNull: false,
      defaultValue: 'SCHEDULE'
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isClosed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    closedById: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
  }, {
    tableName: 'meetings',
    underscored: true,
    timestamps: true,
  });

  return Meeting;
};
