'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('activities').catch(() => null);
    if (!table) return;
    if (table.turn_around_time) return;
    await queryInterface.addColumn('activities', 'turn_around_time', {
      type: Sequelize.STRING(50),
      allowNull: true,
      after: 'date'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('activities', 'turn_around_time');
  }
};
