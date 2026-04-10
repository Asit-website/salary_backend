const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SocialComment = sequelize.define(
    'SocialComment',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      postId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'post_id'
      },
      userId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'user_id'
      },
      parentId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: 'parent_id'
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false
      }
    },
    {
      tableName: 'social_comments',
      underscored: true,
      timestamps: true
    }
  );

  return SocialComment;
};
