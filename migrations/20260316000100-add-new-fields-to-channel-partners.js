'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('channel_partners', 'contact_person_name', {
      type: Sequelize.STRING(150),
      allowNull: true,
      after: 'extra'
    });
    await queryInterface.addColumn('channel_partners', 'address', {
      type: Sequelize.TEXT,
      allowNull: true,
      after: 'contact_person_name'
    });
    await queryInterface.addColumn('channel_partners', 'birth_date', {
      type: Sequelize.DATEONLY,
      allowNull: true,
      after: 'address'
    });
    await queryInterface.addColumn('channel_partners', 'anniversary_date', {
      type: Sequelize.DATEONLY,
      allowNull: true,
      after: 'birth_date'
    });
    await queryInterface.addColumn('channel_partners', 'gst_number', {
      type: Sequelize.STRING(50),
      allowNull: true,
      after: 'anniversary_date'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('channel_partners', 'contact_person_name');
    await queryInterface.removeColumn('channel_partners', 'address');
    await queryInterface.removeColumn('channel_partners', 'birth_date');
    await queryInterface.removeColumn('channel_partners', 'anniversary_date');
    await queryInterface.removeColumn('channel_partners', 'gst_number');
  }
};
