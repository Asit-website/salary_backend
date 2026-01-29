'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('assigned_jobs', 'started_at', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('assigned_jobs', 'start_lat', { type: Sequelize.DOUBLE, allowNull: true });
    await queryInterface.addColumn('assigned_jobs', 'start_lng', { type: Sequelize.DOUBLE, allowNull: true });
    await queryInterface.addColumn('assigned_jobs', 'start_accuracy', { type: Sequelize.FLOAT, allowNull: true });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('assigned_jobs', 'started_at');
    await queryInterface.removeColumn('assigned_jobs', 'start_lat');
    await queryInterface.removeColumn('assigned_jobs', 'start_lng');
    await queryInterface.removeColumn('assigned_jobs', 'start_accuracy');
  },
};
