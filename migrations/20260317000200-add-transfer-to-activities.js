'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('activities', 'transferred_to_id', {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
      after: 'is_closed'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('activities', 'transferred_to_id');
  }
};
