'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('meetings').catch(() => null);
    if (!table || table.remarks) return;
    await queryInterface.addColumn('meetings', 'remarks', {
      type: Sequelize.TEXT,
      allowNull: true,
      after: 'status'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('meetings', 'remarks');
  }
};
