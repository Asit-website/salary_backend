const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SocialLike = sequelize.define(
    'SocialLike',
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
      }
    },
    {
      tableName: 'social_likes',
      underscored: true,
      timestamps: true
    }
  );

  return SocialLike;
};
