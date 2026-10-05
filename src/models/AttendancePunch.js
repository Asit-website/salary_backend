const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AttendancePunch = sequelize.define(
    'AttendancePunch',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      attendanceId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'attendance_id',
      },
      userId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'user_id',
      },
      orgAccountId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'org_account_id',
      },
      shiftId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: 'shift_id',
      },
      slotNumber: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 1,
        field: 'slot_number',
      },
      punchInAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'punch_in_at',
      },
      punchOutAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'punch_out_at',
      },
      punchInPhotoUrl: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'punch_in_photo_url',
      },
      punchOutPhotoUrl: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'punch_out_photo_url',
      },
      punchInLat: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
        field: 'punch_in_lat',
      },
      punchInLng: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
        field: 'punch_in_lng',
      },
      punchOutLat: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
        field: 'punch_out_lat',
      },
      punchOutLng: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
        field: 'punch_out_lng',
      },
      punchInAddress: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'punch_in_address',
      },
      punchOutAddress: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'punch_out_address',
      },
      workMinutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'work_minutes',
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'ACTIVE', // ACTIVE (open punch-in), COMPLETED (punched out)
      },
    },
    {
      tableName: 'attendance_punches',
      underscored: true,
    }
  );

  return AttendancePunch;
};
