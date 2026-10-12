const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PmsCompetencyAssessment = sequelize.define(
    'PmsCompetencyAssessment',
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
      cycleId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'cycle_id',
      },
      employeeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'employee_id',
      },
      evaluatorId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'evaluator_id',
      },
      evaluatorRole: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'Manager',
        field: 'evaluator_role',
        comment: 'Self, Manager, HR, Peer, Subordinate',
      },
      competencyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'competency_id',
      },
      rating: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },
      maxRating: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 5,
        field: 'max_rating',
      },
      comments: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: 'pms_competency_assessments',
      timestamps: true,
      underscored: true,
    }
  );

  return PmsCompetencyAssessment;
};
