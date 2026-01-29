module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('shift_breaks', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      shift_template_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      category: { type: Sequelize.STRING(50), allowNull: true },
      name: { type: Sequelize.STRING(150), allowNull: true },
      pay_type: { type: Sequelize.ENUM('paid', 'unpaid'), allowNull: false, defaultValue: 'unpaid' },
      break_type: { type: Sequelize.ENUM('duration', 'fixed_window'), allowNull: false, defaultValue: 'duration' },
      duration_minutes: { type: Sequelize.INTEGER, allowNull: true },
      start_time: { type: Sequelize.TIME, allowNull: true },
      end_time: { type: Sequelize.TIME, allowNull: true },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('shift_breaks');
  },
};
