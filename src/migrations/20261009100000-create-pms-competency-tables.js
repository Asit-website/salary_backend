'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pms_competencies', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      org_account_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      category: {
        type: Sequelize.STRING(100),
        allowNull: true,
        defaultValue: 'Core',
        comment: 'Core, Leadership, Functional, Behavioral, Managerial',
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      department: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      designation: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      default_rating_scale: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: '1-5 Scale',
      },
      weightage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0,
      },
      active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('pms_competencies', ['org_account_id', 'active'], {
      name: 'ix_pms_competencies_org_active',
    });

    await queryInterface.createTable('pms_competency_assessments', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      org_account_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
      },
      cycle_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
      },
      employee_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
      },
      evaluator_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
      },
      evaluator_role: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'Manager',
        comment: 'Self, Manager, HR, Peer, Subordinate',
      },
      competency_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
      },
      rating: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },
      max_rating: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 5,
      },
      comments: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex(
      'pms_competency_assessments',
      ['org_account_id', 'employee_id', 'cycle_id'],
      { name: 'ix_pms_comp_assess_org_emp_cycle' }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('pms_competency_assessments');
    await queryInterface.dropTable('pms_competencies');
  },
};
