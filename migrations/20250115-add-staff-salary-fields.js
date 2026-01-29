 'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add salary calculation fields to users table
    await queryInterface.addColumn('users', 'basic_salary', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    });

    await queryInterface.addColumn('users', 'hra', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    });

    await queryInterface.addColumn('users', 'da', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    });

    await queryInterface.addColumn('users', 'special_allowance', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    });

    await queryInterface.addColumn('users', 'conveyance_allowance', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    });

    await queryInterface.addColumn('users', 'medical_allowance', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    });

    await queryInterface.addColumn('users', 'telephone_allowance', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    });

    await queryInterface.addColumn('users', 'other_allowances', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    });

    await queryInterface.addColumn('users', 'total_earnings', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    });

    await queryInterface.addColumn('users', 'pf_deduction', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    });

    await queryInterface.addColumn('users', 'esi_deduction', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    });

    await queryInterface.addColumn('users', 'professional_tax', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    });

    await queryInterface.addColumn('users', 'tds_deduction', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    });

    await queryInterface.addColumn('users', 'other_deductions', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    });

    await queryInterface.addColumn('users', 'total_deductions', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    });

    await queryInterface.addColumn('users', 'gross_salary', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    });

    await queryInterface.addColumn('users', 'net_salary', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    });

    await queryInterface.addColumn('users', 'salary_last_calculated', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove all salary calculation fields
    await queryInterface.removeColumn('users', 'basic_salary');
    await queryInterface.removeColumn('users', 'hra');
    await queryInterface.removeColumn('users', 'da');
    await queryInterface.removeColumn('users', 'special_allowance');
    await queryInterface.removeColumn('users', 'conveyance_allowance');
    await queryInterface.removeColumn('users', 'medical_allowance');
    await queryInterface.removeColumn('users', 'telephone_allowance');
    await queryInterface.removeColumn('users', 'other_allowances');
    await queryInterface.removeColumn('users', 'total_earnings');
    await queryInterface.removeColumn('users', 'pf_deduction');
    await queryInterface.removeColumn('users', 'esi_deduction');
    await queryInterface.removeColumn('users', 'professional_tax');
    await queryInterface.removeColumn('users', 'tds_deduction');
    await queryInterface.removeColumn('users', 'other_deductions');
    await queryInterface.removeColumn('users', 'total_deductions');
    await queryInterface.removeColumn('users', 'gross_salary');
    await queryInterface.removeColumn('users', 'net_salary');
    await queryInterface.removeColumn('users', 'salary_last_calculated');
  }
};
