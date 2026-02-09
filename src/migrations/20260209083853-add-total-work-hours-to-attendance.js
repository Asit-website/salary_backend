'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('attendance', 'total_work_hours', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Total work hours calculated from punch-in to punch-out minus breaks'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('attendance', 'total_work_hours');
  }
};
