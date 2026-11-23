const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ActivityTitle = sequelize.define('ActivityTitle', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'org_account_id' },
    title: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    defaultTAT: { type: DataTypes.STRING(50), allowNull: true, field: 'default_tat' },
    createdBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'created_by' },
  }, {
    tableName: 'activity_titles',
    underscored: true,
    timestamps: true,
  });

  return ActivityTitle;
};
