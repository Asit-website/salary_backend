module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('leave_templates', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      name: { type: Sequelize.STRING(150), allowNull: false },
      cycle: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'monthly' }, // monthly|quarterly|yearly
      count_sandwich: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      approval_level: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 }, // 1..3
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.createTable('leave_template_categories', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      leave_template_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      key: { type: Sequelize.STRING(50), allowNull: false },
      name: { type: Sequelize.STRING(150), allowNull: false },
      leave_count: { type: Sequelize.DECIMAL(10,2), allowNull: false, defaultValue: 0 },
      unused_rule: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'lapse' }, // lapse|carry_forward|encash
      carry_limit_days: { type: Sequelize.DECIMAL(10,2), allowNull: true },
      encash_limit_days: { type: Sequelize.DECIMAL(10,2), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addConstraint('leave_template_categories', {
      fields: ['leave_template_id'], type: 'foreign key', name: 'fk_ltc_template_id', references: { table: 'leave_templates', field: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE',
    });

    await queryInterface.createTable('staff_leave_assignments', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      leave_template_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      effective_from: { type: Sequelize.DATEONLY, allowNull: false },
      effective_to: { type: Sequelize.DATEONLY, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addConstraint('staff_leave_assignments', {
      fields: ['user_id'], type: 'foreign key', name: 'fk_sla_user_id', references: { table: 'users', field: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE',
    });
    await queryInterface.addConstraint('staff_leave_assignments', {
      fields: ['leave_template_id'], type: 'foreign key', name: 'fk_sla_template_id', references: { table: 'leave_templates', field: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE',
    });

    await queryInterface.createTable('leave_balances', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      category_key: { type: Sequelize.STRING(50), allowNull: false },
      cycle_start: { type: Sequelize.DATEONLY, allowNull: false },
      cycle_end: { type: Sequelize.DATEONLY, allowNull: false },
      allocated: { type: Sequelize.DECIMAL(10,2), allowNull: false, defaultValue: 0 },
      carried_forward: { type: Sequelize.DECIMAL(10,2), allowNull: false, defaultValue: 0 },
      used: { type: Sequelize.DECIMAL(10,2), allowNull: false, defaultValue: 0 },
      encashed: { type: Sequelize.DECIMAL(10,2), allowNull: false, defaultValue: 0 },
      remaining: { type: Sequelize.DECIMAL(10,2), allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('leave_balances', ['user_id', 'category_key', 'cycle_start', 'cycle_end'], { unique: true, name: 'uniq_lb_user_cat_cycle' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('leave_balances');
    await queryInterface.dropTable('staff_leave_assignments');
    await queryInterface.dropTable('leave_template_categories');
    await queryInterface.dropTable('leave_templates');
  },
};
