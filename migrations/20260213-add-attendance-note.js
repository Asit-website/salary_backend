'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('attendance', 'note', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Admin notes for attendance records'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('attendance', 'note');
  }
};
