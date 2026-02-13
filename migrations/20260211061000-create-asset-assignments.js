'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('asset_assignments', {
      id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        unsigned: true,
      },
      assetId: {
        type: Sequelize.BIGINT,
        allowNull: false,
        unsigned: true,
        field: 'assetId',
        references: {
          model: 'assets',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      assignedTo: {
        type: Sequelize.BIGINT,
        allowNull: false,
        unsigned: true,
        field: 'assignedTo',
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      assignedBy: {
        type: Sequelize.BIGINT,
        allowNull: false,
        unsigned: true,
        field: 'assignedBy',
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      assignedDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'assignedDate',
      },
      returnedDate: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'returnedDate',
      },
      status: {
        type: Sequelize.ENUM('active', 'returned'),
        allowNull: false,
        defaultValue: 'active',
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      conditionAtAssignment: {
        type: Sequelize.ENUM('excellent', 'good', 'fair', 'poor'),
        allowNull: false,
        field: 'conditionAtAssignment',
      },
      conditionAtReturn: {
        type: Sequelize.ENUM('excellent', 'good', 'fair', 'poor'),
        allowNull: true,
        field: 'conditionAtReturn',
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    // Add indexes
    await queryInterface.addIndex('asset_assignments', ['assetId']);
    await queryInterface.addIndex('asset_assignments', ['assignedTo']);
    await queryInterface.addIndex('asset_assignments', ['assignedBy']);
    await queryInterface.addIndex('asset_assignments', ['status']);
    await queryInterface.addIndex('asset_assignments', ['assignedDate']);
    await queryInterface.addIndex('asset_assignments', ['createdAt']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('asset_assignments');
  }
};
