module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('shift_templates', 'enable_multiple_shifts', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    await queryInterface.createTable('shift_rotational_slots', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      shift_template_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      name: { type: Sequelize.STRING(150), allowNull: true },
      start_time: { type: Sequelize.TIME, allowNull: false },
      end_time: { type: Sequelize.TIME, allowNull: false },
      unpaid_break_minutes: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('shift_rotational_slots');
    await queryInterface.removeColumn('shift_templates', 'enable_multiple_shifts');
  }
};
