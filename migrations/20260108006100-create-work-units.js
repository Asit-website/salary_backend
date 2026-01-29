module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('work_units', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      site_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      work_date: { type: Sequelize.DATEONLY, allowNull: false },
      unit_type: { type: Sequelize.STRING(50), allowNull: false },
      quantity: { type: Sequelize.DECIMAL(10,2), allowNull: false, defaultValue: 0 },
      notes: { type: Sequelize.STRING(255), allowNull: true },
      check_in_lat: { type: Sequelize.DECIMAL(10,7), allowNull: true },
      check_in_lng: { type: Sequelize.DECIMAL(10,7), allowNull: true },
      check_in_time: { type: Sequelize.DATE, allowNull: true },
      supervisor_verified: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      verified_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addConstraint('work_units', {
      fields: ['site_id'],
      type: 'foreign key',
      name: 'fk_work_units_site_id',
      references: { table: 'sites', field: 'id' },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    });

    await queryInterface.addConstraint('work_units', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'fk_work_units_user_id',
      references: { table: 'users', field: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('work_units');
  },
};
