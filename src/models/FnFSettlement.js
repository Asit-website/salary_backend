const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FnFSettlement = sequelize.define(
    'FnFSettlement',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
      },
      userId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'user_id'
      },
      orgAccountId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'org_account_id'
      },
      resignationDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'resignation_date'
      },
      finalWorkingDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'final_working_date'
      },
      settlementDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'settlement_date'
      },
      noticeDaysRequired: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'notice_days_required'
      },
      noticeDaysServed: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'notice_days_served'
      },
      noticeRecoveryAmount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00,
        field: 'notice_recovery_amount'
      },
      leaveEncashmentDays: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: false,
        defaultValue: 0.00,
        field: 'leave_encashment_days'
      },
      leaveEncashmentAmount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00,
        field: 'leave_encashment_amount'
      },
      gratuityAmount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00,
        field: 'gratuity_amount'
      },
      pendingSalaryAmount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00,
        field: 'pending_salary_amount'
      },
      loansDeductionAmount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00,
        field: 'loans_deduction_amount'
      },
      advancesDeductionAmount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00,
        field: 'advances_deduction_amount'
      },
      expenseReimbursementAmount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00,
        field: 'expense_reimbursement_amount'
      },
      otherEarnings: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'other_earnings'
      },
      otherDeductions: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'other_deductions'
      },
      totalEarnings: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00,
        field: 'total_earnings'
      },
      totalDeductions: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00,
        field: 'total_deductions'
      },
      netAmount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00,
        field: 'net_amount'
      },
      status: {
        type: DataTypes.ENUM('DRAFT', 'SETTLED', 'PAID'),
        allowNull: false,
        defaultValue: 'DRAFT'
      },
      paymentDetails: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'payment_details'
      },
      remarks: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      payslipPath: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'payslip_path'
      },
      createdById: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: 'created_by_id'
      },
      settledAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'settled_at'
      }
    },
    {
      tableName: 'fnf_settlements',
      timestamps: true,
      underscored: true
    }
  );

  FnFSettlement.associate = (models) => {
    FnFSettlement.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    FnFSettlement.belongsTo(models.User, {
      foreignKey: 'createdById',
      as: 'creator'
    });
    FnFSettlement.belongsTo(models.OrgAccount, {
      foreignKey: 'orgAccountId',
      as: 'orgAccount'
    });
  };

  return FnFSettlement;
};
