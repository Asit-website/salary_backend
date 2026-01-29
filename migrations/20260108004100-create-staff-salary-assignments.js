module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('staff_salary_assignments', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      salary_template_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      effective_from: { type: Sequelize.DATEONLY, allowNull: false },
      effective_to: { type: Sequelize.DATEONLY, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addConstraint('staff_salary_assignments', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'fk_staff_salary_assignments_user_id',
      references: { table: 'users', field: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    await queryInterface.addConstraint('staff_salary_assignments', {
      fields: ['salary_template_id'],
      type: 'foreign key',
      name: 'fk_staff_salary_assignments_template_id',
      references: { table: 'salary_templates', field: 'id' },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    });

    await queryInterface.addIndex('staff_salary_assignments', ['user_id', 'effective_from'], {
      unique: true,
      name: 'uniq_staff_salary_assign_user_from',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('staff_salary_assignments');
  },
};
