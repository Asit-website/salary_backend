'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // 1. Add 'period' to sales_incentive_rules
        await queryInterface.addColumn('sales_incentive_rules', 'period', {
            type: Sequelize.ENUM('per_order', 'daily', 'monthly'),
            allowNull: false,
            defaultValue: 'per_order'
        });

        // 2. Create staff_sales_incentives table
        await queryInterface.createTable('staff_sales_incentives', {
            id: {
                type: Sequelize.BIGINT.UNSIGNED,
                primaryKey: true,
                autoIncrement: true
            },
            org_account_id: {
                type: Sequelize.BIGINT.UNSIGNED,
                allowNull: false,
                references: { model: 'org_accounts', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            staff_user_id: {
                type: Sequelize.BIGINT.UNSIGNED,
                allowNull: false,
                references: { model: 'users', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            incentive_rule_id: {
                type: Sequelize.BIGINT.UNSIGNED,
                allowNull: false,
                references: { model: 'sales_incentive_rules', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            order_id: {
                type: Sequelize.BIGINT.UNSIGNED,
                allowNull: true,
                references: { model: 'orders', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            achieved_amount: {
                type: Sequelize.DECIMAL(15, 2),
                allowNull: false,
                defaultValue: 0
            },
            incentive_amount: {
                type: Sequelize.DECIMAL(15, 2),
                allowNull: false,
                defaultValue: 0
            },
            status: {
                type: Sequelize.ENUM('pending', 'approved', 'rejected'),
                allowNull: false,
                defaultValue: 'pending'
            },
            remarks: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false
            }
        });

        await queryInterface.addIndex('staff_sales_incentives', ['org_account_id']);
        await queryInterface.addIndex('staff_sales_incentives', ['staff_user_id']);
        await queryInterface.addIndex('staff_sales_incentives', ['status']);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('staff_sales_incentives');
        await queryInterface.removeColumn('sales_incentive_rules', 'period');
    }
};
