module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('shift_templates', 'earliest_punch_in_time', { type: Sequelize.TIME, allowNull: true });
    await queryInterface.addColumn('shift_templates', 'latest_punch_out_time', { type: Sequelize.TIME, allowNull: true });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('shift_templates', 'earliest_punch_in_time');
    await queryInterface.removeColumn('shift_templates', 'latest_punch_out_time');
  }
};
