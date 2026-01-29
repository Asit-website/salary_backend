module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('salary_forecasts', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: Sequelize.INTEGER, allowNull: false },
      month: { type: Sequelize.INTEGER, allowNull: false },
      year: { type: Sequelize.INTEGER, allowNull: false },
      forecast_net_pay: { type: Sequelize.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
      assumptions: { type: Sequelize.JSON, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('salary_forecasts', ['user_id', 'year', 'month'], { unique: true });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('salary_forecasts');
  },
};
