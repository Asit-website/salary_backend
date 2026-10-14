"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('org_accounts').catch(() => ({}));
    const addIfMissing = async (name, def) => {
      if (!table[name]) await queryInterface.addColumn('org_accounts', name, def);
    };
    await addIfMissing('business_email', { type: Sequelize.STRING(150), allowNull: true });
    await addIfMissing('state', { type: Sequelize.STRING(100), allowNull: true });
    await addIfMissing('city', { type: Sequelize.STRING(100), allowNull: true });
    await addIfMissing('channel_partner_id', { type: Sequelize.STRING(100), allowNull: true });
    await addIfMissing('role_description', { type: Sequelize.TEXT, allowNull: true });
    await addIfMissing('employee_count', { type: Sequelize.STRING(50), allowNull: true });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('org_accounts', 'employee_count');
    await queryInterface.removeColumn('org_accounts', 'role_description');
    await queryInterface.removeColumn('org_accounts', 'channel_partner_id');
    await queryInterface.removeColumn('org_accounts', 'city');
    await queryInterface.removeColumn('org_accounts', 'state');
    await queryInterface.removeColumn('org_accounts', 'business_email');
  }
};
