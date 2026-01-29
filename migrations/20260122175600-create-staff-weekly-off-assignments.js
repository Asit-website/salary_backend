'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('staff_weekly_off_assignments', {
      id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, autoIncrement: true, primaryKey: true },
      user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      weekly_off_template_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'weekly_off_templates', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      effective_from: { type: Sequelize.DATEONLY, allowNull: false },
      effective_to: { type: Sequelize.DATEONLY, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('staff_weekly_off_assignments', ['user_id']);
    await queryInterface.addIndex('staff_weekly_off_assignments', ['weekly_off_template_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('staff_weekly_off_assignments');
  }
};
