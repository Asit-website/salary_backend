const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AssignedJob = sequelize.define(
    'AssignedJob',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      clientId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      staffUserId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      title: { type: DataTypes.STRING(150), allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      status: { type: DataTypes.ENUM('pending', 'inprogress', 'complete'), allowNull: false, defaultValue: 'pending' },
      assignedOn: { type: DataTypes.DATE, allowNull: true },
      dueDate: { type: DataTypes.DATE, allowNull: true },
      startedAt: { type: DataTypes.DATE, allowNull: true },
      startLat: { type: DataTypes.DOUBLE, allowNull: true },
      startLng: { type: DataTypes.DOUBLE, allowNull: true },
      startAccuracy: { type: DataTypes.FLOAT, allowNull: true },
      endedAt: { type: DataTypes.DATE, allowNull: true },
      endLat: { type: DataTypes.DOUBLE, allowNull: true },
      endLng: { type: DataTypes.DOUBLE, allowNull: true },
      endAccuracy: { type: DataTypes.FLOAT, allowNull: true },
      orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'org_account_id' },
    },
    { tableName: 'assigned_jobs', underscored: true }
  );

  return AssignedJob;
};
