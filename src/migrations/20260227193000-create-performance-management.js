'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('appraisals', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      org_account_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'org_accounts', key: 'id' },
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      title: { type: Sequelize.STRING(120), allowNull: false },
      period_month: { type: Sequelize.STRING(7), allowNull: false },
      score: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      status: { type: Sequelize.ENUM('DRAFT', 'SUBMITTED', 'COMPLETED'), allowNull: false, defaultValue: 'DRAFT' },
      remarks: { type: Sequelize.TEXT, allowNull: true },
      reviewed_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('appraisals', ['org_account_id', 'user_id', 'period_month'], { name: 'ix_appraisals_org_user_period' });

    await queryInterface.createTable('ratings', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      org_account_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'org_accounts', key: 'id' },
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      metric: { type: Sequelize.STRING(120), allowNull: false },
      rating: { type: Sequelize.DECIMAL(5, 2), allowNull: false },
      max_rating: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 5 },
      note: { type: Sequelize.TEXT, allowNull: true },
      rated_at: { type: Sequelize.DATEONLY, allowNull: false },
      rated_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('ratings', ['org_account_id', 'user_id', 'rated_at'], { name: 'ix_ratings_org_user_date' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ratings');
    await queryInterface.dropTable('appraisals');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_appraisals_status;').catch(() => {});
  },
};

