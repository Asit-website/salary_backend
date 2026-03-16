const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const TaskObserverMapping = sequelize.define(
        'TaskObserverMapping',
        {
            id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
            observerId: {
                type: DataTypes.BIGINT.UNSIGNED,
                allowNull: false,
                field: 'observer_id',
                references: { model: 'users', key: 'id' }
            },
            staffId: {
                type: DataTypes.BIGINT.UNSIGNED,
                allowNull: false,
                field: 'staff_id',
                references: { model: 'users', key: 'id' }
            },
            orgAccountId: {
                type: DataTypes.BIGINT.UNSIGNED,
                allowNull: false,
                field: 'org_account_id',
                references: { model: 'org_accounts', key: 'id' }
            },
        },
        {
            tableName: 'task_observer_mappings',
            underscored: true,
            timestamps: true,
        }
    );

    return TaskObserverMapping;
};
