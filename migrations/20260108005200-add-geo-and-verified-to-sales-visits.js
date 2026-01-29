module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('sales_visits');

    if (!table.check_in_lat) {
      await queryInterface.addColumn('sales_visits', 'check_in_lat', {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: true,
        after: 'amount',
      });
    }
    const t2 = await queryInterface.describeTable('sales_visits');
    if (!t2.check_in_lng) {
      await queryInterface.addColumn('sales_visits', 'check_in_lng', {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: true,
        after: t2.check_in_lat ? 'check_in_lat' : 'amount',
      });
    }
    const t3 = await queryInterface.describeTable('sales_visits');
    if (!t3.check_in_time) {
      await queryInterface.addColumn('sales_visits', 'check_in_time', {
        type: Sequelize.DATE,
        allowNull: true,
        after: t3.check_in_lng ? 'check_in_lng' : (t3.check_in_lat ? 'check_in_lat' : 'amount'),
      });
    }
    const t4 = await queryInterface.describeTable('sales_visits');
    if (!t4.verified) {
      await queryInterface.addColumn('sales_visits', 'verified', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        after: t4.check_in_time ? 'check_in_time' : (t4.check_in_lng ? 'check_in_lng' : 'amount'),
      });
    }
  },

  async down(queryInterface) {
    const t1 = await queryInterface.describeTable('sales_visits');
    if (t1.verified) await queryInterface.removeColumn('sales_visits', 'verified');
    const t2 = await queryInterface.describeTable('sales_visits');
    if (t2.check_in_time) await queryInterface.removeColumn('sales_visits', 'check_in_time');
    const t3 = await queryInterface.describeTable('sales_visits');
    if (t3.check_in_lng) await queryInterface.removeColumn('sales_visits', 'check_in_lng');
    const t4 = await queryInterface.describeTable('sales_visits');
    if (t4.check_in_lat) await queryInterface.removeColumn('sales_visits', 'check_in_lat');
  },
};
