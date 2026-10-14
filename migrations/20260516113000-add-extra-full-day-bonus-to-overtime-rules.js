'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('overtime_rules').catch(() => null);
    if (!table) return;
    if (!table.give_extra_full_day_bonus) await queryInterface.addColumn('overtime_rules', 'give_extra_full_day_bonus', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });
    if (!table.extra_full_day_bonus_amount) await queryInterface.addColumn('overtime_rules', 'extra_full_day_bonus_amount', {
      type: Sequelize.INTEGER,
      defaultValue: 25
    });
    if (!table.include_early_arrival) await queryInterface.addColumn('overtime_rules', 'include_early_arrival', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('overtime_rules', 'give_extra_full_day_bonus');
    await queryInterface.removeColumn('overtime_rules', 'extra_full_day_bonus_amount');
    await queryInterface.removeColumn('overtime_rules', 'include_early_arrival');
  }
};
