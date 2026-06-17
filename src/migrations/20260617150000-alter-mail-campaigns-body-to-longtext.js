'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('mail_campaigns', 'body', {
      type: Sequelize.TEXT('long'),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('mail_campaigns', 'body', {
      type: Sequelize.TEXT,
      allowNull: false,
    });
  },
};
