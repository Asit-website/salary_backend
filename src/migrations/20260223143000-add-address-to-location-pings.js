'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('location_pings');
    if (!table.address) {
      await queryInterface.addColumn('location_pings', 'address', {
        type: Sequelize.STRING(255),
        allowNull: true,
        after: 'accuracyMeters',
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('location_pings');
    if (table.address) {
      await queryInterface.removeColumn('location_pings', 'address');
    }
  },
};

