module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('orders', 'phone', {
      type: Sequelize.STRING(20),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('orders', 'phone');
  },
};
