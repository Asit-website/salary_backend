const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const JobPosting = sequelize.define(
    'JobPosting',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      title: { type: DataTypes.STRING(255), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: false },
      requirements: { type: DataTypes.TEXT, allowNull: true },
      benefits: { type: DataTypes.TEXT, allowNull: true },
      location: { type: DataTypes.STRING(255), allowNull: true },
      jobType: { 
        type: DataTypes.ENUM('Full-time', 'Part-time', 'Contract', 'Internship'), 
        allowNull: false,
        defaultValue: 'Full-time',
        field: 'job_type'
      },
      salaryRange: { type: DataTypes.STRING(100), allowNull: true, field: 'salary_range' },
      status: { 
        type: DataTypes.ENUM('DRAFT', 'OPEN', 'CLOSED'), 
        allowNull: false, 
        defaultValue: 'OPEN' 
      },
      orgAccountId: { 
        type: DataTypes.BIGINT.UNSIGNED, 
        allowNull: false, 
        field: 'org_account_id',
        references: { model: 'org_accounts', key: 'id' }
      },
      createdBy: { 
        type: DataTypes.BIGINT.UNSIGNED, 
        allowNull: false, 
        field: 'created_by',
        references: { model: 'users', key: 'id' }
      }
    },
    {
      tableName: 'job_postings',
      underscored: true,
      timestamps: true
    }
  );

  return JobPosting;
};
