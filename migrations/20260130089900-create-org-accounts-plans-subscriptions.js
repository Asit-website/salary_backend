"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // org_accounts
    const orgAcc = await queryInterface.describeTable('org_accounts').catch(() => null);
    if (!orgAcc) {
      await queryInterface.createTable('org_accounts', {
        id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
        name: { type: Sequelize.STRING(150), allowNull: false },
        phone: { type: Sequelize.STRING(30), allowNull: true },
        client_type: { type: Sequelize.STRING(50), allowNull: true },
        location: { type: Sequelize.STRING(255), allowNull: true },
        extra: { type: Sequelize.JSON, allowNull: true },
        status: { type: Sequelize.ENUM('ACTIVE','DISABLED','SUSPENDED'), allowNull: false, defaultValue: 'ACTIVE' },
        created_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      }, { underscored: true });
    }

    // users.org_account_id
    const users = await queryInterface.describeTable('users').catch(() => null);
    if (users && !users.org_account_id) {
      await queryInterface.addColumn('users', 'org_account_id', {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: { model: 'org_accounts', key: 'id' },
      });
      await queryInterface.addIndex('users', ['org_account_id']);
    }

    // plans
    const plans = await queryInterface.describeTable('plans').catch(() => null);
    if (!plans) {
      await queryInterface.createTable('plans', {
        id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
        code: { type: Sequelize.STRING(64), allowNull: false, unique: true },
        name: { type: Sequelize.STRING(120), allowNull: false },
        period_days: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        staff_limit: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 10 },
        price: { type: Sequelize.DECIMAL(10,2), allowNull: false, defaultValue: 0 },
        features: { type: Sequelize.JSON, allowNull: true },
        active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      }, { underscored: true });
    }

    // subscriptions
    const subs = await queryInterface.describeTable('subscriptions').catch(() => null);
    if (!subs) {
      await queryInterface.createTable('subscriptions', {
        id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
        org_account_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'org_accounts', key: 'id' } },
        plan_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'plans', key: 'id' } },
        start_at: { type: Sequelize.DATE, allowNull: false },
        end_at: { type: Sequelize.DATE, allowNull: false },
        status: { type: Sequelize.ENUM('ACTIVE','EXPIRED','CANCELED'), allowNull: false, defaultValue: 'ACTIVE' },
        meta: { type: Sequelize.JSON, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      }, { underscored: true });
      await queryInterface.addIndex('subscriptions', ['org_account_id']);
      await queryInterface.addIndex('subscriptions', ['plan_id']);
      await queryInterface.addIndex('subscriptions', ['status']);
    }
  },

  async down(queryInterface, Sequelize) {
    const subs = await queryInterface.describeTable('subscriptions').catch(() => null);
    if (subs) await queryInterface.dropTable('subscriptions');

    const plans = await queryInterface.describeTable('plans').catch(() => null);
    if (plans) await queryInterface.dropTable('plans');

    const users = await queryInterface.describeTable('users').catch(() => null);
    if (users && users.org_account_id) {
      await queryInterface.removeIndex('users', ['org_account_id']).catch(() => {});
      await queryInterface.removeColumn('users', 'org_account_id');
    }

    const orgAcc = await queryInterface.describeTable('org_accounts').catch(() => null);
    if (orgAcc) {
      await queryInterface.dropTable('org_accounts');
      if (queryInterface.sequelize.getDialect() === 'postgres') {
        await queryInterface.sequelize.query("DROP TYPE IF EXISTS \"enum_org_accounts_status\";");
      }
    }
  }
};
