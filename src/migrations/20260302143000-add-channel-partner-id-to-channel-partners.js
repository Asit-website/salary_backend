'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('channel_partners');
    if (!table.channel_partner_id) {
      await queryInterface.addColumn('channel_partners', 'channel_partner_id', {
        type: Sequelize.STRING(100),
        allowNull: true,
      });

      await queryInterface.sequelize.query(`
        UPDATE channel_partners
        SET channel_partner_id = CONCAT('CP', id)
        WHERE channel_partner_id IS NULL OR channel_partner_id = ''
      `);

      await queryInterface.changeColumn('channel_partners', 'channel_partner_id', {
        type: Sequelize.STRING(100),
        allowNull: false,
      });

      await queryInterface.addIndex('channel_partners', ['channel_partner_id'], {
        unique: true,
        name: 'idx_channel_partners_channel_partner_id_unique'
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('channel_partners');
    if (table.channel_partner_id) {
      try {
        await queryInterface.removeIndex('channel_partners', 'idx_channel_partners_channel_partner_id_unique');
      } catch (_) { }
      await queryInterface.removeColumn('channel_partners', 'channel_partner_id');
    }
  }
};
