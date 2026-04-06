const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MailQueue = sequelize.define(
    'MailQueue',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      campaignId: { 
        type: DataTypes.BIGINT.UNSIGNED, 
        allowNull: false,
        field: 'campaign_id',
        references: { model: 'mail_campaigns', key: 'id' }
      },
      recipientEmail: { 
        type: DataTypes.STRING(255), 
        allowNull: false,
        field: 'recipient_email'
      },
      recipientName: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'recipient_name'
      },
      status: { 
        type: DataTypes.ENUM('PENDING', 'SENT', 'FAILED'), 
        allowNull: false, 
        defaultValue: 'PENDING' 
      },
      error: { type: DataTypes.TEXT, allowNull: true },
      sentAt: { 
        type: DataTypes.DATE, 
        allowNull: true,
        field: 'sent_at'
      },
      isOpened: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_opened'
      },
      openedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'opened_at'
      }
    },
    {
      tableName: 'mail_queue',
      underscored: true,
    }
  );

  MailQueue.associate = (models) => {
    MailQueue.belongsTo(models.MailCampaign, { foreignKey: 'campaignId', as: 'campaign' });
  };

  return MailQueue;
};
