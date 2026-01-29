module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('site_checkpoints', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      site_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      name: { type: Sequelize.STRING(150), allowNull: false },
      qr_code: { type: Sequelize.STRING(100), allowNull: true },
      lat: { type: Sequelize.DECIMAL(10,7), allowNull: true },
      lng: { type: Sequelize.DECIMAL(10,7), allowNull: true },
      radius_m: { type: Sequelize.INTEGER, allowNull: true },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addConstraint('site_checkpoints', {
      fields: ['site_id'],
      type: 'foreign key',
      name: 'fk_site_checkpoints_site_id',
      references: { table: 'sites', field: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    await queryInterface.createTable('patrol_logs', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      site_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      checkpoint_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      check_in_time: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      lat: { type: Sequelize.DECIMAL(10,7), allowNull: true },
      lng: { type: Sequelize.DECIMAL(10,7), allowNull: true },
      photo_url: { type: Sequelize.STRING(255), allowNull: true },
      signature_url: { type: Sequelize.STRING(255), allowNull: true },
      otp: { type: Sequelize.STRING(10), allowNull: true },
      supervisor_verified: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      client_confirmed: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      penalty_amount: { type: Sequelize.DECIMAL(10,2), allowNull: false, defaultValue: 0 },
      incentive_amount: { type: Sequelize.DECIMAL(10,2), allowNull: false, defaultValue: 0 },
      penalty_reason: { type: Sequelize.STRING(255), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addConstraint('patrol_logs', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'fk_patrol_logs_user_id',
      references: { table: 'users', field: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
    await queryInterface.addConstraint('patrol_logs', {
      fields: ['site_id'],
      type: 'foreign key',
      name: 'fk_patrol_logs_site_id',
      references: { table: 'sites', field: 'id' },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    });
    await queryInterface.addConstraint('patrol_logs', {
      fields: ['checkpoint_id'],
      type: 'foreign key',
      name: 'fk_patrol_logs_checkpoint_id',
      references: { table: 'site_checkpoints', field: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('patrol_logs');
    await queryInterface.dropTable('site_checkpoints');
  },
};
