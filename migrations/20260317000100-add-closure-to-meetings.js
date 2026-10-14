'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('meetings').catch(() => null);
    if (!table) return;
    if (!table.is_closed) await queryInterface.addColumn('meetings', 'is_closed', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      after: 'status'
    });
    if (!table.closed_by_id) await queryInterface.addColumn('meetings', 'closed_by_id', {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
      after: 'is_closed'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('meetings', 'closed_by_id');
    await queryInterface.removeColumn('meetings', 'is_closed');
  }
};
