const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ActivityHistory = sequelize.define('ActivityHistory', {
        id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
        activityId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'activity_id' },
        updatedById: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'updated_by_id' },
        oldStatus: { type: DataTypes.STRING(50), allowNull: true, field: 'old_status' },
        newStatus: { type: DataTypes.STRING(50), allowNull: false, field: 'new_status' },
        remarks: { type: DataTypes.TEXT, allowNull: true },
    }, {
        tableName: 'activity_histories',
        underscored: true,
        timestamps: true,
    });

    return ActivityHistory;
};
