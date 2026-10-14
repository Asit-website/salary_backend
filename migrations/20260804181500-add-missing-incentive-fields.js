'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add missing incentive fields to users table based on template requirements
    await queryInterface.addColumn('users', 'attendance_bonus', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    });

    await queryInterface.addColumn('users', 'experience_bonus', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    });

    await queryInterface.addColumn('users', 'management_bonus', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the added incentive fields
    await queryInterface.removeColumn('users', 'attendance_bonus');
    await queryInterface.removeColumn('users', 'experience_bonus');
    await queryInterface.removeColumn('users', 'management_bonus');
  }
};
