'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('pms_self_appraisals');

    if (!tableInfo.original_rating) {
      await queryInterface.addColumn('pms_self_appraisals', 'original_rating', {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      });
    }

    if (!tableInfo.override_rating) {
      await queryInterface.addColumn('pms_self_appraisals', 'override_rating', {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      });
    }

    if (!tableInfo.override_by) {
      await queryInterface.addColumn('pms_self_appraisals', 'override_by', {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
      });
    }

    if (!tableInfo.override_at) {
      await queryInterface.addColumn('pms_self_appraisals', 'override_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    if (!tableInfo.override_reason) {
      await queryInterface.addColumn('pms_self_appraisals', 'override_reason', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    if (!tableInfo.override_history) {
      await queryInterface.addColumn('pms_self_appraisals', 'override_history', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: [],
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('pms_self_appraisals', 'override_history');
    await queryInterface.removeColumn('pms_self_appraisals', 'override_reason');
    await queryInterface.removeColumn('pms_self_appraisals', 'override_at');
    await queryInterface.removeColumn('pms_self_appraisals', 'override_by');
    await queryInterface.removeColumn('pms_self_appraisals', 'override_rating');
    await queryInterface.removeColumn('pms_self_appraisals', 'original_rating');
  },
};
