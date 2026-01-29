'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;
    await queryInterface.createTable('expense_claims', {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      claimId: {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: false,
      },
      expenseType: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
      expenseDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      billNumber: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
      amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      description: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'settled'),
        allowNull: false,
        defaultValue: 'pending',
      },
      approvedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      approvedAmount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
      },
      approvedBy: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      settledAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      attachmentUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
    });
    await queryInterface.addIndex('expense_claims', ['userId']);
    await queryInterface.addIndex('expense_claims', ['expenseDate']);
    await queryInterface.addIndex('expense_claims', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('expense_claims');
  }
};
