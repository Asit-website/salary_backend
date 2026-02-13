'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add half-day and overtime rule fields to shift_templates table
    await queryInterface.addColumn('shift_templates', 'halfDayThresholdMinutes', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Minutes below which attendance is marked as half-day'
    });

    await queryInterface.addColumn('shift_templates', 'overtimeStartMinutes', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Minutes after which overtime starts'
    });

    // Add overtime minutes field to attendance table
    await queryInterface.addColumn('attendance', 'overtimeMinutes', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Overtime minutes calculated'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove half-day and overtime rule fields from shift_templates table
    await queryInterface.removeColumn('shift_templates', 'halfDayThresholdMinutes');
    await queryInterface.removeColumn('shift_templates', 'overtimeStartMinutes');

    // Remove overtime minutes field from attendance table
    await queryInterface.removeColumn('attendance', 'overtimeMinutes');
  }
};
