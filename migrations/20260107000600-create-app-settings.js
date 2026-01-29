module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('app_settings', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      key: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      value: { type: Sequelize.STRING(255), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('app_settings', ['key'], { name: 'idx_app_settings_key', unique: true });

    await queryInterface.bulkInsert('app_settings', [
      {
        key: 'required_work_hours',
        value: '8',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('app_settings');
  },
};
