const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PmsSelfAppraisal = sequelize.define(
    'PmsSelfAppraisal',
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
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id',
      },
      cycleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'cycle_id',
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'DRAFT',
        comment: 'DRAFT, SUBMITTED, REOPENED, COMPLETED',
      },
      overallSelfRating: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        field: 'overall_self_rating',
      },
      overallSelfComments: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'overall_self_comments',
      },
      submittedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'submitted_at',
      },
      reopenedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'reopened_at',
      },
      reopenedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'reopened_by',
      },
      reopenReason: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'reopen_reason',
      },
      overallManagerRating: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        field: 'overall_manager_rating',
      },
      overallManagerComments: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'overall_manager_comments',
      },
      strengths: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      weaknesses: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      developmentAreas: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'development_areas',
      },
      recommendation: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Increment, Promotion, Confirmation, Retain, PIP',
      },
      managerId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'manager_id',
      },
      managerReviewedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'manager_reviewed_at',
      },
      originalRating: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        field: 'original_rating',
      },
      overrideRating: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        field: 'override_rating',
      },
      overrideBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'override_by',
      },
      overrideAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'override_at',
      },
      overrideReason: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'override_reason',
      },
      overrideHistory: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        field: 'override_history',
      },
      incrementType: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: 'PERCENTAGE',
        field: 'increment_type',
      },
      incrementValue: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'increment_value',
      },
      incrementAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'increment_amount',
      },
      previousSalary: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'previous_salary',
      },
      newSalary: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'new_salary',
      },
      incrementEffectiveDate: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'increment_effective_date',
      },
      incrementStatus: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: 'PENDING',
        field: 'increment_status',
      },
      incrementAppliedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'increment_applied_at',
      },
      incrementAppliedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'increment_applied_by',
      },
      incrementNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'increment_notes',
      },
      componentBreakdown: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        field: 'component_breakdown',
      },
    },
    {
      tableName: 'pms_self_appraisals',
      timestamps: true,
      underscored: true,
    }
  );

  return PmsSelfAppraisal;
};
