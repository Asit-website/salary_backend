'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const salesVisits = await queryInterface.describeTable('sales_visits');
    const orders = await queryInterface.describeTable('orders');

    if (!salesVisits.check_in_altitude) {
      await queryInterface.addColumn('sales_visits', 'check_in_altitude', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        after: 'check_in_lng',
      });
    }
    if (!salesVisits.check_in_address) {
      await queryInterface.addColumn('sales_visits', 'check_in_address', {
        type: Sequelize.STRING(255),
        allowNull: true,
        after: 'check_in_altitude',
      });
    }

    if (!orders.check_in_lat) {
      await queryInterface.addColumn('orders', 'check_in_lat', {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: true,
        after: 'proof_url',
      });
    }
    if (!orders.check_in_lng) {
      await queryInterface.addColumn('orders', 'check_in_lng', {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: true,
        after: 'check_in_lat',
      });
    }
    if (!orders.check_in_altitude) {
      await queryInterface.addColumn('orders', 'check_in_altitude', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        after: 'check_in_lng',
      });
    }
    if (!orders.check_in_address) {
      await queryInterface.addColumn('orders', 'check_in_address', {
        type: Sequelize.STRING(255),
        allowNull: true,
        after: 'check_in_altitude',
      });
    }
  },

  async down(queryInterface) {
    const salesVisits = await queryInterface.describeTable('sales_visits');
    const orders = await queryInterface.describeTable('orders');

    if (salesVisits.check_in_address) await queryInterface.removeColumn('sales_visits', 'check_in_address');
    if (salesVisits.check_in_altitude) await queryInterface.removeColumn('sales_visits', 'check_in_altitude');

    if (orders.check_in_address) await queryInterface.removeColumn('orders', 'check_in_address');
    if (orders.check_in_altitude) await queryInterface.removeColumn('orders', 'check_in_altitude');
    if (orders.check_in_lng) await queryInterface.removeColumn('orders', 'check_in_lng');
    if (orders.check_in_lat) await queryInterface.removeColumn('orders', 'check_in_lat');
  },
};

