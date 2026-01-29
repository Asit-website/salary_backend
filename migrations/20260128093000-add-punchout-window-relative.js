'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('shift_templates', 'min_punch_out_after_minutes', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('shift_templates', 'max_punch_out_after_minutes', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('shift_templates', 'min_punch_out_after_minutes');
    await queryInterface.removeColumn('shift_templates', 'max_punch_out_after_minutes');
  }
};
