'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add columns to plans table
    await queryInterface.addColumn('plans', 'payroll_enabled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await queryInterface.addColumn('plans', 'performance_enabled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await queryInterface.addColumn('plans', 'ai_reports_enabled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await queryInterface.addColumn('plans', 'ai_assistant_enabled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    // Add columns to subscriptions table
    await queryInterface.addColumn('subscriptions', 'payroll_enabled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await queryInterface.addColumn('subscriptions', 'performance_enabled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await queryInterface.addColumn('subscriptions', 'ai_reports_enabled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await queryInterface.addColumn('subscriptions', 'ai_assistant_enabled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('plans', 'payroll_enabled');
    await queryInterface.removeColumn('plans', 'performance_enabled');
    await queryInterface.removeColumn('plans', 'ai_reports_enabled');
    await queryInterface.removeColumn('plans', 'ai_assistant_enabled');

    await queryInterface.removeColumn('subscriptions', 'payroll_enabled');
    await queryInterface.removeColumn('subscriptions', 'performance_enabled');
    await queryInterface.removeColumn('subscriptions', 'ai_reports_enabled');
    await queryInterface.removeColumn('subscriptions', 'ai_assistant_enabled');
  }
};
