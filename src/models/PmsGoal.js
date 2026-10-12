const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PmsGoal = sequelize.define(
    'PmsGoal',
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
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id',
      },
      cycleId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'cycle_id',
      },
      kpiId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'kpi_id',
      },
      goal: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      target: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      achievement: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'achievement',
      },
      achievementPct: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        field: 'achievement_pct',
      },
      unit: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '%, ₹, Count, Units, Days, Hours',
      },
      startDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'start_date',
      },
      endDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'end_date',
      },
      weightage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },
      priority: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Medium',
        comment: 'High, Medium, Low, Critical',
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'In Progress',
        comment: 'Not Started, In Progress, Completed, Exceeded, Not Achieved',
      },
      selfRating: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        field: 'self_rating',
      },
      employeeComment: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'employee_comment',
      },
      managerComment: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'manager_comment',
      },
      managerRating: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        field: 'manager_rating',
      },
      managerAchievement: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'manager_achievement',
      },
      supportingDocument: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'supporting_document',
      },
      assignedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'assigned_by',
      },
      assignedByName: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'assigned_by_name',
      },
      active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: 'pms_goals',
      timestamps: true,
      underscored: true,
    }
  );

  return PmsGoal;
};
