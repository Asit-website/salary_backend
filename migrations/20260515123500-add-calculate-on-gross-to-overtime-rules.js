'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('overtime_rules').catch(() => null);
    if (!table || table.calculate_on_gross) return;
    await queryInterface.addColumn('overtime_rules', 'calculate_on_gross', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('overtime_rules', 'calculate_on_gross');
  }
};
