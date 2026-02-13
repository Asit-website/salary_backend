'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('assets', {
      id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        unsigned: true,
      },
      orgId: {
        type: Sequelize.BIGINT,
        allowNull: false,
        unsigned: true,
        field: 'orgId',
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      category: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      serialNumber: {
        type: Sequelize.STRING(100),
        allowNull: true,
        unique: true,
        field: 'serialNumber',
      },
      model: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      brand: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      purchaseDate: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        field: 'purchaseDate',
      },
      purchaseCost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        field: 'purchaseCost',
      },
      currentValue: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        field: 'currentValue',
      },
      location: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      condition: {
        type: Sequelize.ENUM('excellent', 'good', 'fair', 'poor'),
        allowNull: false,
        defaultValue: 'good',
      },
      status: {
        type: Sequelize.ENUM('available', 'in_use', 'maintenance', 'retired', 'lost'),
        allowNull: false,
        defaultValue: 'available',
      },
      assignedTo: {
        type: Sequelize.BIGINT,
        allowNull: true,
        unsigned: true,
        field: 'assignedTo',
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      assignedDate: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'assignedDate',
      },
      warrantyExpiry: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        field: 'warrantyExpiry',
      },
      lastMaintenanceDate: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        field: 'lastMaintenanceDate',
      },
      nextMaintenanceDate: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        field: 'nextMaintenanceDate',
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
    await queryInterface.addIndex('assets', ['orgId']);
    await queryInterface.addIndex('assets', ['category']);
    await queryInterface.addIndex('assets', ['status']);
    await queryInterface.addIndex('assets', ['assignedTo']);
    await queryInterface.addIndex('assets', ['serialNumber']);
    await queryInterface.addIndex('assets', ['createdAt']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('assets');
  }
};
