const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PmsRatingScale = sequelize.define(
    'PmsRatingScale',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      orgAccountId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'org_account_id',
      },
      scaleName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'scale_name',
      },
      scaleType: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: '5-Point',
        field: 'scale_type',
        comment: '5-Point, 10-Point, 100-Point, Custom',
      },
      maxPoints: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 5,
        field: 'max_points',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      isDefault: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_default',
      },
      levels: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
        comment: 'JSON array of rating levels [{ score, title, description, minPct, maxPct, color }]',
      },
      active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: 'pms_rating_scales',
      timestamps: true,
      underscored: true,
    }
  );

  return PmsRatingScale;
};
