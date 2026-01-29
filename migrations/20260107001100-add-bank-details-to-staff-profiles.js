module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('staff_profiles', 'bank_account_holder_name', {
      type: Sequelize.STRING(150),
      allowNull: true,
    });

    await queryInterface.addColumn('staff_profiles', 'bank_account_number', {
      type: Sequelize.STRING(50),
      allowNull: true,
    });

    await queryInterface.addColumn('staff_profiles', 'bank_ifsc', {
      type: Sequelize.STRING(20),
      allowNull: true,
    });

    await queryInterface.addColumn('staff_profiles', 'bank_name', {
      type: Sequelize.STRING(120),
      allowNull: true,
    });

    await queryInterface.addColumn('staff_profiles', 'bank_branch', {
      type: Sequelize.STRING(120),
      allowNull: true,
    });

    await queryInterface.addColumn('staff_profiles', 'upi_id', {
      type: Sequelize.STRING(120),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('staff_profiles', 'upi_id');
    await queryInterface.removeColumn('staff_profiles', 'bank_branch');
    await queryInterface.removeColumn('staff_profiles', 'bank_name');
    await queryInterface.removeColumn('staff_profiles', 'bank_ifsc');
    await queryInterface.removeColumn('staff_profiles', 'bank_account_number');
    await queryInterface.removeColumn('staff_profiles', 'bank_account_holder_name');
  },
};
