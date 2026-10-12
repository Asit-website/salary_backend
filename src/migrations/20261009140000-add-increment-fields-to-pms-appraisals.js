'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('pms_self_appraisals');

    if (!tableInfo.increment_type) {
      await queryInterface.addColumn('pms_self_appraisals', 'increment_type', {
        type: Sequelize.STRING(20),
        allowNull: true,
        defaultValue: 'PERCENTAGE',
      });
    }

    if (!tableInfo.increment_value) {
      await queryInterface.addColumn('pms_self_appraisals', 'increment_value', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      });
    }

    if (!tableInfo.increment_amount) {
      await queryInterface.addColumn('pms_self_appraisals', 'increment_amount', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      });
    }

    if (!tableInfo.previous_salary) {
      await queryInterface.addColumn('pms_self_appraisals', 'previous_salary', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      });
    }

    if (!tableInfo.new_salary) {
      await queryInterface.addColumn('pms_self_appraisals', 'new_salary', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      });
    }

    if (!tableInfo.increment_effective_date) {
      await queryInterface.addColumn('pms_self_appraisals', 'increment_effective_date', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    if (!tableInfo.increment_status) {
      await queryInterface.addColumn('pms_self_appraisals', 'increment_status', {
        type: Sequelize.STRING(20),
        allowNull: true,
        defaultValue: 'PENDING',
      });
    }

    if (!tableInfo.increment_applied_at) {
      await queryInterface.addColumn('pms_self_appraisals', 'increment_applied_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    if (!tableInfo.increment_applied_by) {
      await queryInterface.addColumn('pms_self_appraisals', 'increment_applied_by', {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
      });
    }

    if (!tableInfo.increment_notes) {
      await queryInterface.addColumn('pms_self_appraisals', 'increment_notes', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('pms_self_appraisals', 'increment_notes');
    await queryInterface.removeColumn('pms_self_appraisals', 'increment_applied_by');
    await queryInterface.removeColumn('pms_self_appraisals', 'increment_applied_at');
    await queryInterface.removeColumn('pms_self_appraisals', 'increment_status');
    await queryInterface.removeColumn('pms_self_appraisals', 'increment_effective_date');
    await queryInterface.removeColumn('pms_self_appraisals', 'new_salary');
    await queryInterface.removeColumn('pms_self_appraisals', 'previous_salary');
    await queryInterface.removeColumn('pms_self_appraisals', 'increment_amount');
    await queryInterface.removeColumn('pms_self_appraisals', 'increment_value');
    await queryInterface.removeColumn('pms_self_appraisals', 'increment_type');
  },
};
