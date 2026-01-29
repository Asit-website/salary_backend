module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ai_anomalies', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: Sequelize.INTEGER, allowNull: false },
      date: { type: Sequelize.DATEONLY, allowNull: false },
      type: { type: Sequelize.STRING(50), allowNull: false },
      severity: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'medium' },
      details: { type: Sequelize.JSON, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('ai_anomalies', ['user_id', 'date']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('ai_anomalies');
  },
};
