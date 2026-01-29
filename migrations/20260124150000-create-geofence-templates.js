'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('geofence_templates', {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      name: { type: Sequelize.STRING(128), allowNull: false },
      approval_required: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('geofence_templates');
  }
};
