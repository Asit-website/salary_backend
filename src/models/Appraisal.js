const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Appraisal = sequelize.define('Appraisal', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    orgAccountId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'org_account_id',
    },
    userId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'user_id',
    },
    title: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    periodMonth: {
      type: DataTypes.STRING(7),
      allowNull: false,
      field: 'period_month',
    },
    effectiveFrom: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'effective_from',
    },
    score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('DRAFT', 'SUBMITTED', 'COMPLETED'),
      allowNull: false,
      defaultValue: 'DRAFT',
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    reviewedBy: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'reviewed_by',
    },
  }, {
    tableName: 'appraisals',
    underscored: true,
  });

  return Appraisal;
};
