'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('geofence_sites', {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      geofence_template_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      name: { type: Sequelize.STRING(128), allowNull: false },
      address: { type: Sequelize.STRING(512), allowNull: true },
      latitude: { type: Sequelize.DECIMAL(10, 7), allowNull: false },
      longitude: { type: Sequelize.DECIMAL(10, 7), allowNull: false },
      radius_meters: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 100 },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('geofence_sites');
  }
};
