'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('holiday_templates', {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      name: { type: Sequelize.STRING(128), allowNull: false },
      startMonth: { type: Sequelize.INTEGER, allowNull: true },
      endMonth: { type: Sequelize.INTEGER, allowNull: true },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.createTable('holiday_dates', {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      holidayTemplateId: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'holiday_templates', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      name: { type: Sequelize.STRING(128), allowNull: false },
      date: { type: Sequelize.DATEONLY, allowNull: false },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.createTable('staff_holiday_assignments', {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      userId: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      holidayTemplateId: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'holiday_templates', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      effectiveFrom: { type: Sequelize.DATEONLY, allowNull: false },
      effectiveTo: { type: Sequelize.DATEONLY, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('staff_holiday_assignments');
    await queryInterface.dropTable('holiday_dates');
    await queryInterface.dropTable('holiday_templates');
  }
};
