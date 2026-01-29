module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('staff_profiles', 'photo_url', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('staff_profiles', 'photo_url');
  },
};
