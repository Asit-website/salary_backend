const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Rating = sequelize.define('Rating', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    orgAccountId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'org_account_id',
    },
    userId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'user_id',
    },
    metric: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    rating: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    maxRating: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 5,
      field: 'max_rating',
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ratedAt: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'rated_at',
    },
    ratedBy: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'rated_by',
    },
  }, {
    tableName: 'ratings',
    underscored: true,
  });

  return Rating;
};

