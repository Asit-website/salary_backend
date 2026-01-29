'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('org_business_info', 'logo_url', { type: Sequelize.STRING(255), allowNull: true });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('org_business_info', 'logo_url');
  }
};
