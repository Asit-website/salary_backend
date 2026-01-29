module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('attendance', 'is_on_break', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn('attendance', 'break_started_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('attendance', 'break_total_seconds', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('attendance', 'break_total_seconds');
    await queryInterface.removeColumn('attendance', 'break_started_at');
    await queryInterface.removeColumn('attendance', 'is_on_break');
  },
};
