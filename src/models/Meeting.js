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
  }, {
    tableName: 'meetings',
    underscored: true,
    timestamps: true,
  });

  return Meeting;
};
