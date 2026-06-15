'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Create fnf_settings table
    await queryInterface.createTable('fnf_settings', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
      },
      org_account_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false
      },
      leave_basis: {
        type: Sequelize.ENUM('basic_da', 'basic', 'gross'),
        allowNull: false,
        defaultValue: 'basic_da'
      },
      leave_divisor: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'calendar_month'
      },
      leave_max_days: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      notice_basis: {
        type: Sequelize.ENUM('basic_da', 'basic', 'gross'),
        allowNull: false,
        defaultValue: 'gross'
      },
      notice_divisor: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'calendar_month'
      },
      gratuity_enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      gratuity_min_years: {
        type: Sequelize.DECIMAL(4, 2),
        allowNull: false,
        defaultValue: 4.80
      },
      gratuity_divisor: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 26
      },
      gratuity_multiplier_days: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 15
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    await queryInterface.addIndex('fnf_settings', ['org_account_id'], {
      unique: true,
      name: 'ux_fnf_settings_org_account_id'
    });

    // 2. Create fnf_settlements table
    await queryInterface.createTable('fnf_settlements', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false
      },
      org_account_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false
      },
      resignation_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      final_working_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      settlement_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      notice_days_required: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      notice_days_served: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      notice_recovery_amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      leave_encashment_days: {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      leave_encashment_amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      gratuity_amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      pending_salary_amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      loans_deduction_amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      advances_deduction_amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      expense_reimbursement_amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      other_earnings: {
        type: Sequelize.JSON,
        allowNull: true
      },
      other_deductions: {
        type: Sequelize.JSON,
        allowNull: true
      },
      total_earnings: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      total_deductions: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      net_amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      status: {
        type: Sequelize.ENUM('DRAFT', 'SETTLED', 'PAID'),
        allowNull: false,
        defaultValue: 'DRAFT'
      },
      payment_details: {
        type: Sequelize.JSON,
        allowNull: true
      },
      remarks: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      payslip_path: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      created_by_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true
      },
      settled_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    await queryInterface.addIndex('fnf_settlements', ['org_account_id'], {
      name: 'idx_fnf_settlements_org'
    });
    await queryInterface.addIndex('fnf_settlements', ['user_id'], {
      name: 'idx_fnf_settlements_user'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('fnf_settlements');
    await queryInterface.dropTable('fnf_settings');
  }
};
