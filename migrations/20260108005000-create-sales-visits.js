module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sales_visits', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      visit_date: { type: Sequelize.DATE, allowNull: false },
      sales_person: { type: Sequelize.STRING(150), allowNull: true },
      visit_type: { type: Sequelize.STRING(50), allowNull: true },
      client_name: { type: Sequelize.STRING(150), allowNull: true },
      phone: { type: Sequelize.STRING(30), allowNull: true },
      client_type: { type: Sequelize.STRING(50), allowNull: true },
      location: { type: Sequelize.STRING(255), allowNull: true },
      made_order: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      amount: { type: Sequelize.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addConstraint('sales_visits', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'fk_sales_visits_user_id',
      references: { table: 'users', field: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    await queryInterface.createTable('sales_visit_attachments', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      visit_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      file_url: { type: Sequelize.STRING(255), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addConstraint('sales_visit_attachments', {
      fields: ['visit_id'],
      type: 'foreign key',
      name: 'fk_sales_visit_attachments_visit_id',
      references: { table: 'sales_visits', field: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    await queryInterface.addIndex('sales_visits', ['user_id', 'visit_date'], { name: 'idx_sales_visits_user_date' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sales_visit_attachments');
    await queryInterface.dropTable('sales_visits');
  },
};
