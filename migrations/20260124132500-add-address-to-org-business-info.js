'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('org_business_info', 'address_line1', { type: Sequelize.TEXT, allowNull: true });
    await queryInterface.addColumn('org_business_info', 'address_line2', { type: Sequelize.TEXT, allowNull: true });
    await queryInterface.addColumn('org_business_info', 'pincode', { type: Sequelize.STRING(16), allowNull: true });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('org_business_info', 'address_line1');
    await queryInterface.removeColumn('org_business_info', 'address_line2');
    await queryInterface.removeColumn('org_business_info', 'pincode');
  }
};
