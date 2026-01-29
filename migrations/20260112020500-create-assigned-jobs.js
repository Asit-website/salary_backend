'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('assigned_jobs', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      client_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      staff_user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      title: { type: Sequelize.STRING(150), allowNull: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      status: { type: Sequelize.ENUM('pending', 'inprogress', 'complete'), allowNull: false, defaultValue: 'pending' },
      assigned_on: { type: Sequelize.DATE, allowNull: true },
      due_date: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('assigned_jobs', ['staff_user_id']);
    await queryInterface.addIndex('assigned_jobs', ['client_id']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('assigned_jobs');
  },
};
