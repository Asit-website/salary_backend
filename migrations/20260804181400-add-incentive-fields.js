'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add incentive fields to users table based on salary template structure
    await queryInterface.addColumn('users', 'performance_bonus', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    });

    await queryInterface.addColumn('users', 'overtime_allowance', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    });

    await queryInterface.addColumn('users', 'night_shift_allowance', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    });

    await queryInterface.addColumn('users', 'project_bonus', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    });

    await queryInterface.addColumn('users', 'festival_bonus', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    });

    await queryInterface.addColumn('users', 'total_incentives', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove all incentive fields
    await queryInterface.removeColumn('users', 'performance_bonus');
    await queryInterface.removeColumn('users', 'overtime_allowance');
    await queryInterface.removeColumn('users', 'night_shift_allowance');
    await queryInterface.removeColumn('users', 'project_bonus');
    await queryInterface.removeColumn('users', 'festival_bonus');
    await queryInterface.removeColumn('users', 'total_incentives');
  }
};
