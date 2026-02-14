'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('subscriptions', 'max_geolocation_staff', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0,
      after: 'staff_limit'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('subscriptions', 'max_geolocation_staff');
  }
};
