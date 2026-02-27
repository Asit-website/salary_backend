'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('attendance_automation_rules', {
            id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
            key: { type: Sequelize.STRING(100), allowNull: false },
            config: { type: Sequelize.TEXT, allowNull: true },
            active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
            org_account_id: {
                type: Sequelize.BIGINT.UNSIGNED,
                allowNull: true,
                references: { model: 'org_accounts', key: 'id' },
                onDelete: 'SET NULL',
                field: 'org_account_id'
            },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
        });

        await queryInterface.addIndex('attendance_automation_rules', ['key', 'org_account_id'], {
            unique: true,
            name: 'unique_key_org_automation',
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('attendance_automation_rules');
    },
};
