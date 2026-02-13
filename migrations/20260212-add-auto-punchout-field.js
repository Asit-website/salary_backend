'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add autoPunchout field to attendance table
    await queryInterface.addColumn('attendance', 'autoPunchout', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether punchout was automatic'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove autoPunchout field from attendance table
    await queryInterface.removeColumn('attendance', 'autoPunchout');
  }
};
