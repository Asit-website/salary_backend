const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MeetingHistory = sequelize.define('MeetingHistory', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    meetingId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    updatedById: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    oldStatus: { type: DataTypes.STRING(50), allowNull: true },
    newStatus: { type: DataTypes.STRING(50), allowNull: false },
    remarks: { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: 'meeting_histories',
    underscored: true,
    timestamps: true,
  });

  return MeetingHistory;
};
