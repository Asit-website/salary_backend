'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    try {
      // Add salesEnabled column
      await queryInterface.addColumn('plans', 'sales_enabled', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    } catch (error) {
      console.log('sales_enabled column already exists or error:', error.message);
    }

    try {
      // Add geolocationEnabled column
      await queryInterface.addColumn('plans', 'geolocation_enabled', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    } catch (error) {
      console.log('geolocation_enabled column already exists or error:', error.message);
    }

    try {
      // Add maxGeolocationStaff column
      await queryInterface.addColumn('plans', 'max_geolocation_staff', {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0
      });
    } catch (error) {
      console.log('max_geolocation_staff column already exists or error:', error.message);
    }

    try {
      // Add maxGeolocationStaff column to clients table
      await queryInterface.addColumn('clients', 'max_geolocation_staff', {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0
      });
    } catch (error) {
      console.log('clients.max_geolocation_staff column already exists or error:', error.message);
    }
  },

  async down (queryInterface, Sequelize) {
    try {
      await queryInterface.removeColumn('plans', 'sales_enabled');
    } catch (error) {
      console.log('Error removing sales_enabled column:', error.message);
    }

    try {
      await queryInterface.removeColumn('plans', 'geolocation_enabled');
    } catch (error) {
      console.log('Error removing geolocation_enabled column:', error.message);
    }

    try {
      await queryInterface.removeColumn('plans', 'max_geolocation_staff');
    } catch (error) {
      console.log('Error removing max_geolocation_staff column:', error.message);
    }

    try {
      await queryInterface.removeColumn('clients', 'max_geolocation_staff');
    } catch (error) {
      console.log('Error removing clients.max_geolocation_staff column:', error.message);
    }
  }
};
