'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('sales_incentive_rules', {
            id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
            org_account_id: {
                type: Sequelize.BIGINT.UNSIGNED,
                allowNull: false,
                references: { model: 'org_accounts', key: 'id' },
                onDelete: 'CASCADE',
            },
            name: { type: Sequelize.STRING(120), allowNull: false },
            rule_type: {
                type: Sequelize.ENUM('fixed', 'value_slab', 'unit_slab'),
                allowNull: false
            },
            config: { type: Sequelize.JSON, allowNull: false },
            active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
        });

        await queryInterface.createTable('staff_incentive_rules', {
            id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
            org_account_id: {
                type: Sequelize.BIGINT.UNSIGNED,
                allowNull: false,
                references: { model: 'org_accounts', key: 'id' },
                onDelete: 'CASCADE',
            },
            staff_user_id: {
                type: Sequelize.BIGINT.UNSIGNED,
                allowNull: false,
                references: { model: 'users', key: 'id' },
                onDelete: 'CASCADE',
            },
            incentive_rule_id: {
                type: Sequelize.BIGINT.UNSIGNED,
                allowNull: false,
                references: { model: 'sales_incentive_rules', key: 'id' },
                onDelete: 'CASCADE',
            },
            active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
        });

        await queryInterface.addIndex('staff_incentive_rules', ['org_account_id', 'staff_user_id', 'incentive_rule_id'], {
            unique: true,
            name: 'ux_staff_incentive_rules_org_user_rule',
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('staff_incentive_rules');
        await queryInterface.dropTable('sales_incentive_rules');
    },
};
