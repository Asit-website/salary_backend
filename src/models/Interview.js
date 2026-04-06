const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Interview = sequelize.define(
    'Interview',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      candidateId: { 
        type: DataTypes.BIGINT.UNSIGNED, 
        allowNull: false, 
        field: 'candidate_id',
        references: { model: 'candidates', key: 'id' }
      },
      interviewerId: { 
        type: DataTypes.BIGINT.UNSIGNED, 
        allowNull: false, 
        field: 'interviewer_id',
        references: { model: 'users', key: 'id' }
      },
      scheduledAt: { type: DataTypes.DATE, allowNull: false, field: 'scheduled_at' },
      durationMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30, field: 'duration_minutes' },
      meetingLink: { type: DataTypes.STRING(255), allowNull: true, field: 'meeting_link' },
      location: { type: DataTypes.STRING(255), allowNull: true },
      status: { 
        type: DataTypes.ENUM('SCHEDULED', 'COMPLETED', 'CANCELLED'), 
        allowNull: false, 
        defaultValue: 'SCHEDULED' 
      },
      notes: { type: DataTypes.TEXT, allowNull: true },
      feedback: { type: DataTypes.TEXT, allowNull: true }
    },
    {
      tableName: 'interviews',
      underscored: true,
      timestamps: true
    }
  );

  return Interview;
};
