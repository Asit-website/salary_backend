'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.showAllTables();
    if (!tableInfo.includes('pms_salary_revisions')) {
      await queryInterface.createTable('pms_salary_revisions', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        orgAccountId: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        userId: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
        },
        appraisalId: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        previousSalary: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        newSalary: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        incrementType: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: 'PERCENTAGE',
        },
        incrementValue: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
        },
        incrementAmount: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        componentBreakdown: {
          type: Sequelize.JSON,
          allowNull: true,
        },
        effectiveDate: {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        status: {
          type: Sequelize.STRING(30),
          allowNull: false,
          defaultValue: 'PENDING_APPROVAL', // PENDING_APPROVAL | APPROVED | REJECTED | APPLIED_TO_PAYROLL
        },
        requestedBy: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: true,
        },
        approvedBy: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: true,
        },
        approvedAt: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        rejectionReason: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        appliedAt: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('pms_salary_revisions');
  },
};
