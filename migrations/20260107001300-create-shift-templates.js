module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('shift_templates', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },

      shift_type: { type: Sequelize.ENUM('fixed', 'open', 'rotational'), allowNull: false, defaultValue: 'fixed' },
      name: { type: Sequelize.STRING(150), allowNull: false },
      code: { type: Sequelize.STRING(50), allowNull: true, unique: true },

      start_time: { type: Sequelize.TIME, allowNull: true },
      end_time: { type: Sequelize.TIME, allowNull: true },
      work_minutes: { type: Sequelize.INTEGER, allowNull: true },
      buffer_minutes: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },

      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },

      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('shift_templates');
  },
};
