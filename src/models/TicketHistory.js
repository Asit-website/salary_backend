const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const TicketHistory = sequelize.define('TicketHistory', {
        id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
        ticketId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'ticket_id' },
        updatedById: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'updated_by_id' },
        oldStatus: { type: DataTypes.STRING(50), allowNull: true, field: 'old_status' },
        newStatus: { type: DataTypes.STRING(50), allowNull: false, field: 'new_status' },
        remarks: { type: DataTypes.TEXT, allowNull: true },
    }, {
        tableName: 'ticket_histories',
        underscored: true,
        timestamps: true, // This will automatically add createdAt and updatedAt
    });

    return TicketHistory;
};
