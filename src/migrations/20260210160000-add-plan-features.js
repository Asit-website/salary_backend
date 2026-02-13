'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    try {
      // Add salesEnabled column if it doesn't exist
      await queryInterface.addColumn('plans', 'salesEnabled', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    } catch (error) {
      // Column might already exist
      console.log('salesEnabled column already exists or error:', error.message);
    }

    try {
      // Add geolocationEnabled column if it doesn't exist
      await queryInterface.addColumn('plans', 'geolocationEnabled', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    } catch (error) {
      // Column might already exist
      console.log('geolocationEnabled column already exists or error:', error.message);
    }

    try {
      // Add description column if it doesn't exist
      await queryInterface.addColumn('plans', 'description', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    } catch (error) {
      // Column might already exist
      console.log('description column already exists or error:', error.message);
    }
  },

  async down (queryInterface, Sequelize) {
    try {
      await queryInterface.removeColumn('plans', 'salesEnabled');
    } catch (error) {
      console.log('Error removing salesEnabled column:', error.message);
    }

    try {
      await queryInterface.removeColumn('plans', 'geolocationEnabled');
    } catch (error) {
      console.log('Error removing geolocationEnabled column:', error.message);
    }

    try {
      await queryInterface.removeColumn('plans', 'description');
    } catch (error) {
      console.log('Error removing description column:', error.message);
    }
  }
};
