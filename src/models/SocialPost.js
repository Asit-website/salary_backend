const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SocialPost = sequelize.define(
    'SocialPost',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      orgAccountId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'org_account_id'
      },
      userId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'user_id'
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      mediaUrl: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'media_url'
      },
      type: {
        type: DataTypes.ENUM('post', 'announcement', 'birthday', 'anniversary'),
        defaultValue: 'post',
        allowNull: false
      }
    },
    {
      tableName: 'social_posts',
      underscored: true,
      timestamps: true
    }
  );

  return SocialPost;
};
