module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('staff_profiles', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, unique: true },

      staff_id: { type: Sequelize.STRING(50), allowNull: true, unique: true },
      name: { type: Sequelize.STRING(150), allowNull: true },
      email: { type: Sequelize.STRING(191), allowNull: true },
      phone: { type: Sequelize.STRING(20), allowNull: true },

      designation: { type: Sequelize.STRING(120), allowNull: true },
      department: { type: Sequelize.STRING(120), allowNull: true },
      staff_type: { type: Sequelize.STRING(80), allowNull: true },
      date_of_joining: { type: Sequelize.DATEONLY, allowNull: true },

      address_line1: { type: Sequelize.STRING(255), allowNull: true },
      address_line2: { type: Sequelize.STRING(255), allowNull: true },
      city: { type: Sequelize.STRING(100), allowNull: true },
      state: { type: Sequelize.STRING(100), allowNull: true },
      postal_code: { type: Sequelize.STRING(20), allowNull: true },

      emergency_contact: { type: Sequelize.STRING(20), allowNull: true },
      blood_group: { type: Sequelize.STRING(10), allowNull: true },

      extra: { type: Sequelize.JSON, allowNull: true },

      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addConstraint('staff_profiles', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'fk_staff_profiles_user_id',
      references: { table: 'users', field: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('staff_profiles');
  },
};
