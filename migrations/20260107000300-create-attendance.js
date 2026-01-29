module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('attendance', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      date: { type: Sequelize.DATEONLY, allowNull: false },
      punched_in_at: { type: Sequelize.DATE, allowNull: true },
      punched_out_at: { type: Sequelize.DATE, allowNull: true },
      punch_in_photo_url: { type: Sequelize.STRING(255), allowNull: true },
      punch_out_photo_url: { type: Sequelize.STRING(255), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addConstraint('attendance', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'fk_attendance_user_id',
      references: { table: 'users', field: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    await queryInterface.addIndex('attendance', ['user_id', 'date'], {
      unique: true,
      name: 'uniq_attendance_user_date',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('attendance');
  },
};
