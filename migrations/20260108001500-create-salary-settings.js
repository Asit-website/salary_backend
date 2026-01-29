module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('salary_settings', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      payable_days_mode: { type: Sequelize.ENUM('calendar_month', 'every_30', 'every_28', 'every_26', 'exclude_weekly_offs'), allowNull: false, defaultValue: 'calendar_month' },
      weekly_offs: { type: Sequelize.JSON, allowNull: true },
      hours_per_day: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 8 },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('salary_settings');
  },
};
