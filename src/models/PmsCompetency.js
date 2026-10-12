const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PmsCompetency = sequelize.define(
    'PmsCompetency',
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
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      category: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'Core',
        comment: 'Core, Leadership, Functional, Behavioral, Managerial',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      department: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      designation: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      defaultRatingScale: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: '1-5 Scale',
        field: 'default_rating_scale',
      },
      weightage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0,
      },
      active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: 'pms_competencies',
      timestamps: true,
      underscored: true,
    }
  );

  return PmsCompetency;
};
