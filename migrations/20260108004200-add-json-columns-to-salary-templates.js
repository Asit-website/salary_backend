module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('salary_templates');

    if (!table.earnings) {
      await queryInterface.addColumn('salary_templates', 'earnings', {
        type: Sequelize.JSON,
        allowNull: true,
        after: 'hours_per_day',
      });
    }

    const tableAfterEarnings = await queryInterface.describeTable('salary_templates');

    if (!tableAfterEarnings.incentives) {
      await queryInterface.addColumn('salary_templates', 'incentives', {
        type: Sequelize.JSON,
        allowNull: true,
        after: tableAfterEarnings.earnings ? 'earnings' : 'hours_per_day',
      });
    }

    const tableAfterIncentives = await queryInterface.describeTable('salary_templates');

    if (!tableAfterIncentives.deductions) {
      await queryInterface.addColumn('salary_templates', 'deductions', {
        type: Sequelize.JSON,
        allowNull: true,
        after: tableAfterIncentives.incentives ? 'incentives' : (tableAfterIncentives.earnings ? 'earnings' : 'hours_per_day'),
      });
    }

    const tableAfterDeductions = await queryInterface.describeTable('salary_templates');

    if (!tableAfterDeductions.metadata) {
      await queryInterface.addColumn('salary_templates', 'metadata', {
        type: Sequelize.JSON,
        allowNull: true,
        after: tableAfterDeductions.deductions ? 'deductions' : (tableAfterDeductions.incentives ? 'incentives' : (tableAfterDeductions.earnings ? 'earnings' : 'hours_per_day')),
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('salary_templates');
    if (table.metadata) {
      await queryInterface.removeColumn('salary_templates', 'metadata');
    }
    const t2 = await queryInterface.describeTable('salary_templates');
    if (t2.deductions) {
      await queryInterface.removeColumn('salary_templates', 'deductions');
    }
    const t3 = await queryInterface.describeTable('salary_templates');
    if (t3.incentives) {
      await queryInterface.removeColumn('salary_templates', 'incentives');
    }
    const t4 = await queryInterface.describeTable('salary_templates');
    if (t4.earnings) {
      await queryInterface.removeColumn('salary_templates', 'earnings');
    }
  },
};
