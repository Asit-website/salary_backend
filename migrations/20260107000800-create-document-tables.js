module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('document_types', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      key: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(120), allowNull: false },
      required: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      allowed_mime: { type: Sequelize.STRING(255), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('document_types', ['key'], { name: 'idx_document_types_key', unique: true });

    await queryInterface.createTable('staff_documents', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      document_type_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'document_types', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      file_url: { type: Sequelize.STRING(255), allowNull: false },
      file_name: { type: Sequelize.STRING(255), allowNull: true },
      status: { type: Sequelize.ENUM('SUBMITTED', 'APPROVED', 'REJECTED'), allowNull: false, defaultValue: 'SUBMITTED' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('staff_documents', ['user_id', 'document_type_id'], {
      name: 'uniq_staff_document_user_type',
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('staff_documents');
    await queryInterface.dropTable('document_types');
  },
};
