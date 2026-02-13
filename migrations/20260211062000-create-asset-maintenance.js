'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('asset_maintenance', {
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
      maintenanceType: {
        type: Sequelize.ENUM('preventive', 'corrective', 'emergency'),
        allowNull: false,
        field: 'maintenanceType',
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      scheduledDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        field: 'scheduledDate',
      },
      completedDate: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        field: 'completedDate',
      },
      cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      vendor: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      performedBy: {
        type: Sequelize.BIGINT,
        allowNull: true,
        unsigned: true,
        field: 'performedBy',
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      status: {
        type: Sequelize.ENUM('scheduled', 'in_progress', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'scheduled',
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      attachments: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: [],
      },
      createdBy: {
        type: Sequelize.BIGINT,
        allowNull: false,
        unsigned: true,
        field: 'createdBy',
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      updatedBy: {
        type: Sequelize.BIGINT,
        allowNull: true,
        unsigned: true,
        field: 'updatedBy',
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
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
    await queryInterface.addIndex('asset_maintenance', ['assetId']);
    await queryInterface.addIndex('asset_maintenance', ['maintenanceType']);
    await queryInterface.addIndex('asset_maintenance', ['status']);
    await queryInterface.addIndex('asset_maintenance', ['scheduledDate']);
    await queryInterface.addIndex('asset_maintenance', ['performedBy']);
    await queryInterface.addIndex('asset_maintenance', ['createdAt']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('asset_maintenance');
  }
};
