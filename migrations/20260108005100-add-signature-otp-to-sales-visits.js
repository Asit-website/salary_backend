module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('sales_visits');

    if (!table.client_signature_url) {
      await queryInterface.addColumn('sales_visits', 'client_signature_url', {
        type: Sequelize.STRING(255),
        allowNull: true,
        after: 'location',
      });
    }

    const t2 = await queryInterface.describeTable('sales_visits');
    if (!t2.client_otp) {
      await queryInterface.addColumn('sales_visits', 'client_otp', {
        type: Sequelize.STRING(10),
        allowNull: true,
        after: t2.client_signature_url ? 'client_signature_url' : 'location',
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('sales_visits');
    if (table.client_otp) {
      await queryInterface.removeColumn('sales_visits', 'client_otp');
    }
    const t2 = await queryInterface.describeTable('sales_visits');
    if (t2.client_signature_url) {
      await queryInterface.removeColumn('sales_visits', 'client_signature_url');
    }
  },
};
