'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add salaryTemplateId column to users table
    await queryInterface.addColumn('users', 'salary_template_id', {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
      references: {
        model: 'salary_templates',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove salaryTemplateId column from users table
    await queryInterface.removeColumn('users', 'salary_template_id');
  }
};
