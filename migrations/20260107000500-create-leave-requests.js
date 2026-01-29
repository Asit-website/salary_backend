module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('leave_requests', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      start_date: { type: Sequelize.DATEONLY, allowNull: false },
      end_date: { type: Sequelize.DATEONLY, allowNull: false },
      leave_type: { type: Sequelize.STRING(32), allowNull: false },
      reason: { type: Sequelize.STRING(500), allowNull: true },
      status: { type: Sequelize.ENUM('PENDING', 'APPROVED', 'REJECTED'), allowNull: false, defaultValue: 'PENDING' },
      reviewed_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      reviewed_at: { type: Sequelize.DATE, allowNull: true },
      review_note: { type: Sequelize.STRING(500), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addConstraint('leave_requests', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'fk_leave_requests_user_id',
      references: { table: 'users', field: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    await queryInterface.addConstraint('leave_requests', {
      fields: ['reviewed_by'],
      type: 'foreign key',
      name: 'fk_leave_requests_reviewed_by',
      references: { table: 'users', field: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });

    await queryInterface.addIndex('leave_requests', ['user_id', 'status'], {
      name: 'idx_leave_requests_user_status',
    });

    await queryInterface.addIndex('leave_requests', ['status', 'start_date'], {
      name: 'idx_leave_requests_status_start_date',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('leave_requests');
  },
};
