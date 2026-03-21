'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('ai_anomalies', 'org_account_id', {
      type: Sequelize.INTEGER,
      allowNull: true // Temporarily true for existing rows, then we could seed or enforce
    });
    await queryInterface.addColumn('ai_anomalies', 'month', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    await queryInterface.addColumn('ai_anomalies', 'year', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    await queryInterface.addColumn('ai_anomalies', 'message', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn('ai_anomalies', 'categories', {
      type: Sequelize.JSON,
      allowNull: true
    });

    await queryInterface.addIndex('ai_anomalies', ['org_account_id']);
    await queryInterface.addIndex('ai_anomalies', ['user_id', 'month', 'year']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('ai_anomalies', 'org_account_id');
    await queryInterface.removeColumn('ai_anomalies', 'month');
    await queryInterface.removeColumn('ai_anomalies', 'year');
    await queryInterface.removeColumn('ai_anomalies', 'message');
    await queryInterface.removeColumn('ai_anomalies', 'categories');
  }
};
