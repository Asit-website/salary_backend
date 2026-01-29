'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('assigned_jobs', 'ended_at', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('assigned_jobs', 'end_lat', { type: Sequelize.DOUBLE, allowNull: true });
    await queryInterface.addColumn('assigned_jobs', 'end_lng', { type: Sequelize.DOUBLE, allowNull: true });
    await queryInterface.addColumn('assigned_jobs', 'end_accuracy', { type: Sequelize.FLOAT, allowNull: true });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('assigned_jobs', 'ended_at');
    await queryInterface.removeColumn('assigned_jobs', 'end_lat');
    await queryInterface.removeColumn('assigned_jobs', 'end_lng');
    await queryInterface.removeColumn('assigned_jobs', 'end_accuracy');
  },
};
