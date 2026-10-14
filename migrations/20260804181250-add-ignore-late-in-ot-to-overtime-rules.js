'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('overtime_rules').catch(() => null);
    if (!table || table.ignore_late_in_ot) return;
    await queryInterface.addColumn('overtime_rules', 'ignore_late_in_ot', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('overtime_rules', 'ignore_late_in_ot');
  }
};