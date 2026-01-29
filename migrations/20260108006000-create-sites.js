module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sites', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      name: { type: Sequelize.STRING(150), allowNull: false },
      address: { type: Sequelize.STRING(255), allowNull: true },
      lat: { type: Sequelize.DECIMAL(10,7), allowNull: true },
      lng: { type: Sequelize.DECIMAL(10,7), allowNull: true },
      geofence_radius_m: { type: Sequelize.INTEGER, allowNull: true },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sites');
  },
};
