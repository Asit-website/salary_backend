'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add MAX_BREAK_DURATION setting to app_settings table
    await queryInterface.bulkInsert('app_settings', [
      {
        key: 'MAX_BREAK_DURATION',
        value: '30', // Default 30 minutes
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {
      ignoreDuplicates: true // Don't error if it already exists
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove MAX_BREAK_DURATION setting if needed
    await queryInterface.bulkDelete('app_settings', {
      key: 'MAX_BREAK_DURATION'
    });
  }
};
