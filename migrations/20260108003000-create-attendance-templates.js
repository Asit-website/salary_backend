module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('attendance_templates', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      name: { type: Sequelize.STRING(150), allowNull: false },
      code: { type: Sequelize.STRING(50), allowNull: true, unique: true },

      // Attendance mode
      attendance_mode: { type: Sequelize.ENUM('mark_present_by_default', 'manual', 'location_based', 'selfie_location'), allowNull: false, defaultValue: 'manual' },

      // Holidays behaviour
      holidays_rule: { type: Sequelize.ENUM('disallow', 'comp_off', 'allow'), allowNull: false, defaultValue: 'disallow' },

      // Tracking and punches
      track_in_out_enabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      require_punch_out: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      allow_multiple_punches: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },

      // Mark absent on previous days
      mark_absent_prev_days_enabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      mark_absent_rule: { type: Sequelize.ENUM('rule1', 'rule2', 'rule3', 'rule4', 'none'), allowNull: false, defaultValue: 'none' },

      // Effective working hours rule (future use)
      effective_hours_rule: { type: Sequelize.STRING(50), allowNull: true },

      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('attendance_templates');
  },
};
