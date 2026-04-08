const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Candidate = sequelize.define(
    'Candidate',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      jobId: { 
        type: DataTypes.BIGINT.UNSIGNED, 
        allowNull: false, 
        field: 'job_id',
        references: { model: 'job_postings', key: 'id' }
      },
      name: { type: DataTypes.STRING(255), allowNull: false },
      email: { type: DataTypes.STRING(255), allowNull: false },
      phone: { type: DataTypes.STRING(20), allowNull: false },
      resumeUrl: { type: DataTypes.STRING(255), allowNull: true, field: 'resume_url' },
      status: { 
        type: DataTypes.ENUM('APPLIED', 'SCREENING', 'INTERVIEW', 'OFFERED', 'SELECTED', 'REJECTED', 'HIRED'), 
        allowNull: false, 
        defaultValue: 'APPLIED' 
      },
      totalExperience: { type: DataTypes.STRING(50), allowNull: true, field: 'total_experience' },
      currentCtc: { type: DataTypes.STRING(50), allowNull: true, field: 'current_ctc' },
      expectedCtc: { type: DataTypes.STRING(50), allowNull: true, field: 'expected_ctc' },
      noticePeriod: { type: DataTypes.STRING(50), allowNull: true, field: 'notice_period' },
      rating: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
      source: { type: DataTypes.STRING(100), allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      orgAccountId: { 
        type: DataTypes.BIGINT.UNSIGNED, 
        allowNull: false, 
        field: 'org_account_id',
        references: { model: 'org_accounts', key: 'id' }
      }
    },
    {
      tableName: 'candidates',
      underscored: true,
      timestamps: true
    }
  );

  return Candidate;
};
