module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('routes', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      name: { type: Sequelize.STRING(150), allowNull: false },
      code: { type: Sequelize.STRING(50), allowNull: true, unique: true },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.createTable('route_stops', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      route_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      seq_no: { type: Sequelize.INTEGER, allowNull: false },
      name: { type: Sequelize.STRING(150), allowNull: false },
      lat: { type: Sequelize.DECIMAL(10,7), allowNull: true },
      lng: { type: Sequelize.DECIMAL(10,7), allowNull: true },
      radius_m: { type: Sequelize.INTEGER, allowNull: true },
      planned_time: { type: Sequelize.TIME, allowNull: true },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addConstraint('route_stops', {
      fields: ['route_id'],
      type: 'foreign key',
      name: 'fk_route_stops_route_id',
      references: { table: 'routes', field: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    await queryInterface.createTable('staff_route_assignments', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      route_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      effective_date: { type: Sequelize.DATEONLY, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addConstraint('staff_route_assignments', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'fk_staff_route_assign_user_id',
      references: { table: 'users', field: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    await queryInterface.addConstraint('staff_route_assignments', {
      fields: ['route_id'],
      type: 'foreign key',
      name: 'fk_staff_route_assign_route_id',
      references: { table: 'routes', field: 'id' },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    });

    await queryInterface.createTable('route_stop_checkins', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      route_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      route_stop_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      check_in_time: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      lat: { type: Sequelize.DECIMAL(10,7), allowNull: true },
      lng: { type: Sequelize.DECIMAL(10,7), allowNull: true },
      photo_url: { type: Sequelize.STRING(255), allowNull: true },
      signature_url: { type: Sequelize.STRING(255), allowNull: true },
      otp: { type: Sequelize.STRING(10), allowNull: true },
      verified: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addConstraint('route_stop_checkins', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'fk_route_stop_checkins_user_id',
      references: { table: 'users', field: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
    await queryInterface.addConstraint('route_stop_checkins', {
      fields: ['route_id'],
      type: 'foreign key',
      name: 'fk_route_stop_checkins_route_id',
      references: { table: 'routes', field: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
    await queryInterface.addConstraint('route_stop_checkins', {
      fields: ['route_stop_id'],
      type: 'foreign key',
      name: 'fk_route_stop_checkins_stop_id',
      references: { table: 'route_stops', field: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    await queryInterface.addIndex('route_stops', ['route_id', 'seq_no'], { unique: true, name: 'uniq_route_stop_seq' });
    await queryInterface.addIndex('staff_route_assignments', ['user_id', 'effective_date'], { unique: false, name: 'idx_staff_route_assign_effective' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('route_stop_checkins');
    await queryInterface.dropTable('staff_route_assignments');
    await queryInterface.dropTable('route_stops');
    await queryInterface.dropTable('routes');
  },
};
