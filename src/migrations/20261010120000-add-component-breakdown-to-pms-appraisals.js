'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('pms_self_appraisals');

    if (!tableInfo.component_breakdown) {
      await queryInterface.addColumn('pms_self_appraisals', 'component_breakdown', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: [],
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('pms_self_appraisals', 'component_breakdown');
  },
};
