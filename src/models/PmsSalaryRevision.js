const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PmsSalaryRevision = sequelize.define('PmsSalaryRevision', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    orgAccountId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    appraisalId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    previousSalary: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    newSalary: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    incrementType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'PERCENTAGE',
    },
    incrementValue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    incrementAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    componentBreakdown: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    effectiveDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'PENDING_APPROVAL', // PENDING_APPROVAL | APPROVED | REJECTED | APPLIED_TO_PAYROLL
    },
    requestedBy: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    approvedBy: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    appliedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'pms_salary_revisions',
    timestamps: true,
  });

  return PmsSalaryRevision;
};
