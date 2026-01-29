'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('org_brands', {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      display_name: { type: Sequelize.STRING(128), allowNull: false },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    // Seed a default brand
    await queryInterface.bulkInsert('org_brands', [{ display_name: 'ThinkTech', active: true, created_at: new Date(), updated_at: new Date() }]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('org_brands');
  }
};
