"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('loans', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      userId: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      date: { type: Sequelize.DATEONLY, allowNull: false },
      amount: { type: Sequelize.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
      type: { type: Sequelize.ENUM('loan','payment'), allowNull: false, defaultValue: 'loan' },
      description: { type: Sequelize.STRING(500) },
      notifySms: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('loans', ['userId']);
    await queryInterface.addIndex('loans', ['date']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('loans');
  }
};
