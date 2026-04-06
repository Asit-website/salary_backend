const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MailCampaign = sequelize.define(
    'MailCampaign',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      subject: { type: DataTypes.STRING(255), allowNull: false },
      body: { type: DataTypes.TEXT, allowNull: false },
      status: { 
        type: DataTypes.ENUM('PENDING', 'SENDING', 'COMPLETED', 'PAUSED'), 
        allowNull: false, 
        defaultValue: 'PENDING' 
      },
      totalRecipients: { 
        type: DataTypes.INTEGER, 
        allowNull: false, 
        defaultValue: 0,
        field: 'total_recipients'
      },
      sentCount: { 
        type: DataTypes.INTEGER, 
        allowNull: false, 
        defaultValue: 0,
        field: 'sent_count'
      },
      createdBy: { 
        type: DataTypes.BIGINT.UNSIGNED, 
        allowNull: true,
        field: 'created_by'
      },
    },
    {
      tableName: 'mail_campaigns',
      underscored: true,
    }
  );

  return MailCampaign;
};
