module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('staff_shift_assignments', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },

      user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      shift_template_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },

      effective_from: { type: Sequelize.DATEONLY, allowNull: false },
      effective_to: { type: Sequelize.DATEONLY, allowNull: true },

      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addConstraint('staff_shift_assignments', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'fk_staff_shift_assignments_user_id',
      references: { table: 'users', field: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    await queryInterface.addConstraint('staff_shift_assignments', {
      fields: ['shift_template_id'],
      type: 'foreign key',
      name: 'fk_staff_shift_assignments_shift_template_id',
      references: { table: 'shift_templates', field: 'id' },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    });

    await queryInterface.addIndex('staff_shift_assignments', ['user_id', 'effective_from'], {
      unique: true,
      name: 'uniq_staff_shift_assignments_user_effective_from',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('staff_shift_assignments');
  },
};
