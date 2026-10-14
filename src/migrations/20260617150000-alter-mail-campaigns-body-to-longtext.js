'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('mail_campaigns').catch(() => null);
    if (!table || !table.body) return;
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
