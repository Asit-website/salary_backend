'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('meetings', 'is_closed', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      after: 'status'
    });
    await queryInterface.addColumn('meetings', 'closed_by_id', {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
      after: 'is_closed'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('meetings', 'closed_by_id');
    await queryInterface.removeColumn('meetings', 'is_closed');
  }
};
