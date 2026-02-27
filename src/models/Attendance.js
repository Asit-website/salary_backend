const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Attendance = sequelize.define(
    'Attendance',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      date: { type: DataTypes.DATEONLY, allowNull: false },

      punchedInAt: { type: DataTypes.DATE, allowNull: true },
      punchedOutAt: { type: DataTypes.DATE, allowNull: true },

      // Persisted status: present | absent | half_day | leave
      status: { type: DataTypes.STRING(20), allowNull: true },

      isOnBreak: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      breakStartedAt: { type: DataTypes.DATE, allowNull: true },
      breakTotalSeconds: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      totalWorkHours: { type: DataTypes.DECIMAL(5, 2), allowNull: true }, // Total work hours calculated
      overtimeMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }, // Overtime minutes calculated
      autoPunchout: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }, // Whether punchout was automatic

      punchInPhotoUrl: { type: DataTypes.STRING(255), allowNull: true },
      punchOutPhotoUrl: { type: DataTypes.STRING(255), allowNull: true },

      // Punch-in Location
      latitude: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
      longitude: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
      address: { type: DataTypes.TEXT, allowNull: true },

      // Punch-out Location
      punchOutLatitude: { type: DataTypes.DECIMAL(10, 8), allowNull: true, field: 'punch_out_latitude' },
      punchOutLongitude: { type: DataTypes.DECIMAL(11, 8), allowNull: true, field: 'punch_out_longitude' },
      punchOutAddress: { type: DataTypes.TEXT, allowNull: true, field: 'punch_out_address' },

      note: { type: DataTypes.TEXT, allowNull: true }, // Admin notes for attendance
      orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'org_account_id' },
    },
    {
      tableName: 'attendance',
      underscored: true,
      indexes: [{ unique: true, fields: ['user_id', 'date'] }],
    }
  );

  return Attendance;
};
