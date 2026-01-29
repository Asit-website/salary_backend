'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('org_kyb', {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      business_type: { type: Sequelize.STRING(64), allowNull: true },
      gstin: { type: Sequelize.STRING(32), allowNull: true },
      business_name: { type: Sequelize.STRING(160), allowNull: true },
      business_address: { type: Sequelize.TEXT, allowNull: true },
      cin: { type: Sequelize.STRING(64), allowNull: true },
      director_name: { type: Sequelize.STRING(120), allowNull: true },
      company_pan: { type: Sequelize.STRING(32), allowNull: true },
      bank_account_number: { type: Sequelize.STRING(64), allowNull: true },
      ifsc: { type: Sequelize.STRING(32), allowNull: true },
      doc_certificate_incorp: { type: Sequelize.STRING(255), allowNull: true },
      doc_company_pan: { type: Sequelize.STRING(255), allowNull: true },
      doc_director_pan: { type: Sequelize.STRING(255), allowNull: true },
      doc_cancelled_cheque: { type: Sequelize.STRING(255), allowNull: true },
      doc_director_id: { type: Sequelize.STRING(255), allowNull: true },
      doc_gstin_certificate: { type: Sequelize.STRING(255), allowNull: true },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('org_kyb');
  }
};
