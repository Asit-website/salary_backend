const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PmsAppraisalCycle = sequelize.define(
    'PmsAppraisalCycle',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      orgAccountId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'org_account_id',
      },
      cycleName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'cycle_name',
      },
      financialYear: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'financial_year',
      },
      startDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'start_date',
      },
      endDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'end_date',
      },
      appraisalStartDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'appraisal_start_date',
      },
      selfAppraisalDeadline: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'self_appraisal_deadline',
      },
      managerReviewDeadline: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'manager_review_deadline',
      },
      hrReviewDeadline: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'hr_review_deadline',
      },
      finalApprovalDeadline: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'final_approval_deadline',
      },
      frequency: {
        type: DataTypes.STRING,
        defaultValue: 'Annual',
        allowNull: false,
        comment: 'Annual, Half-Yearly, Quarterly, Monthly, Custom',
      },
      frequencyPeriod: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'frequency_period',
        comment: 'e.g. Q1, Q2, H1, April-March, etc.',
      },
      allowHrExtension: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'allow_hr_extension',
      },
      status: {
        type: DataTypes.STRING,
        defaultValue: 'Draft',
        allowNull: false,
        comment: 'Draft, Open, Self Assessment, Manager Review, HR Review, Approval Pending, Completed, Closed',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: 'pms_appraisal_cycles',
      timestamps: true,
      underscored: true,
    }
  );

  return PmsAppraisalCycle;
};
