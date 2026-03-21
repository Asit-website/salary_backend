'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('staff_advances', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      staff_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      org_account_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      advance_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      deduction_month: {
        type: Sequelize.STRING(10),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending', 'deducted', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      updated_by: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    await queryInterface.addIndex('staff_advances', ['staff_id', 'status']);
    await queryInterface.addIndex('staff_advances', ['org_account_id', 'deduction_month']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('staff_advances');
  }
};
