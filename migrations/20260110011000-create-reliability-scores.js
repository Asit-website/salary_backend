module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('reliability_scores', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: Sequelize.INTEGER, allowNull: false },
      month: { type: Sequelize.INTEGER, allowNull: false },
      year: { type: Sequelize.INTEGER, allowNull: false },
      score: { type: Sequelize.DECIMAL(10,2), allowNull: false, defaultValue: 0 },
      breakdown: { type: Sequelize.JSON, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('reliability_scores', ['user_id', 'year', 'month'], { unique: true });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('reliability_scores');
  },
};
