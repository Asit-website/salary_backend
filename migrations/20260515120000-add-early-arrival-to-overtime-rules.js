'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('overtime_rules').catch(() => null);
    if (!table || table.include_early_arrival) return;
    await queryInterface.addColumn('overtime_rules', 'include_early_arrival', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('overtime_rules', 'include_early_arrival');
  }
};
