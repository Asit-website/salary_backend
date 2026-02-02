'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('attendance_templates');
    
    // Add missing columns if they don't exist
    const columnsToAdd = [
      { name: 'code', type: Sequelize.STRING(50), allowNull: true },
      { name: 'attendance_mode', type: Sequelize.STRING(50), allowNull: true, defaultValue: 'manual' },
      { name: 'holidays_rule', type: Sequelize.STRING(50), allowNull: true, defaultValue: 'disallow' },
      { name: 'track_in_out_enabled', type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false },
      { name: 'require_punch_out', type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false },
      { name: 'allow_multiple_punches', type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false },
      { name: 'mark_absent_prev_days_enabled', type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false },
      { name: 'mark_absent_rule', type: Sequelize.STRING(50), allowNull: true, defaultValue: 'none' },
      { name: 'effective_hours_rule', type: Sequelize.STRING(50), allowNull: true },
      { name: 'active', type: Sequelize.BOOLEAN, allowNull: true, defaultValue: true },
      { name: 'org_account_id', type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
    ];

    for (const col of columnsToAdd) {
      if (!tableDesc[col.name]) {
        try {
          await queryInterface.addColumn('attendance_templates', col.name, {
            type: col.type,
            allowNull: col.allowNull,
            defaultValue: col.defaultValue,
          });
          console.log(`Added column ${col.name}`);
        } catch (e) {
          console.log(`Column ${col.name} might already exist or error:`, e.message);
        }
      }
    }

    // Remove unique constraint from code if exists
    try {
      await queryInterface.removeIndex('attendance_templates', 'code');
    } catch (e) {}
    try {
      await queryInterface.removeIndex('attendance_templates', 'attendance_templates_code');
    } catch (e) {}
    try {
      await queryInterface.removeConstraint('attendance_templates', 'attendance_templates_code');
    } catch (e) {}
  },

  async down(queryInterface, Sequelize) {
    // No down migration needed
  },
};
