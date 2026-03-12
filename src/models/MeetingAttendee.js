const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MeetingAttendee = sequelize.define('MeetingAttendee', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    meetingId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    status: {
      type: DataTypes.ENUM('PENDING', 'ACCEPTED', 'DECLINED'),
      allowNull: false,
      defaultValue: 'PENDING'
    },
  }, {
    tableName: 'meeting_attendees',
    underscored: true,
    timestamps: true,
  });

  return MeetingAttendee;
};
