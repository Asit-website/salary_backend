const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const LetterTemplate = sequelize.define('LetterTemplate', {
        id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
        title: { type: DataTypes.STRING(150), allowNull: false },
        content: { type: DataTypes.TEXT('long'), allowNull: false },
        active: { type: DataTypes.BOOLEAN, defaultValue: true },
        orgAccountId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'org_account_id' },
    }, {
        tableName: 'letter_templates',
        underscored: true,
        timestamps: true,
    });

    return LetterTemplate;
};
