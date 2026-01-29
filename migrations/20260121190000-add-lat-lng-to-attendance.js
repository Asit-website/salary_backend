'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('attendance', 'lat', {
      type: Sequelize.DECIMAL(10, 8),
      allowNull: true,
    });
    await queryInterface.addColumn('attendance', 'lng', {
      type: Sequelize.DECIMAL(11, 8),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('attendance', 'lat');
    await queryInterface.removeColumn('attendance', 'lng');
  },
};
