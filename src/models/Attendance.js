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

      punchInPhotoUrl: { type: DataTypes.STRING(255), allowNull: true },
      punchOutPhotoUrl: { type: DataTypes.STRING(255), allowNull: true },
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
