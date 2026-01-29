module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('leave_requests');
    if (!table.category_key) {
      await queryInterface.addColumn('leave_requests', 'category_key', { type: Sequelize.STRING(50), allowNull: true, after: 'leave_type' });
    }
    const t2 = await queryInterface.describeTable('leave_requests');
    if (!t2.days) {   
      await queryInterface.addColumn('leave_requests', 'days', { type: Sequelize.DECIMAL(10,2), allowNull: true, after: 'end_date' });
    }
    const t3 = await queryInterface.describeTable('leave_requests');
    if (!t3.approval_level_required) {
      await queryInterface.addColumn('leave_requests', 'approval_level_required', { type: Sequelize.INTEGER, allowNull: true, after: 'status' });
    }
    const t4 = await queryInterface.describeTable('leave_requests');
    if (!t4.approval_level_done) {
      await queryInterface.addColumn('leave_requests', 'approval_level_done', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0, after: 'approval_level_required' });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('leave_requests');
    if (table.approval_level_done) await queryInterface.removeColumn('leave_requests', 'approval_level_done');
    const t2 = await queryInterface.describeTable('leave_requests');
    if (t2.approval_level_required) await queryInterface.removeColumn('leave_requests', 'approval_level_required');
    const t3 = await queryInterface.describeTable('leave_requests');
    if (t3.days) await queryInterface.removeColumn('leave_requests', 'days');
    const t4 = await queryInterface.describeTable('leave_requests');
    if (t4.category_key) await queryInterface.removeColumn('leave_requests', 'category_key');
  },
};
