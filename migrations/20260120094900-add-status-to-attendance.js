"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add `status` column to `attendance`
    // Values: 'present' | 'absent' | 'half_day' | 'leave'
    await queryInterface.addColumn("attendance", "status", {
      type: Sequelize.STRING(20),
      allowNull: true,
      after: "punched_out_at", // MySQL only; ignored by others
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("attendance", "status");
  },
};
