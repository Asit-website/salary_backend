'use strict';

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const today = new Date(now.getTime() - now.getTimezoneOffset()*60000).toISOString().slice(0,10);
    await queryInterface.bulkInsert('incentive_targets', [
      {
        staff_user_id: 2, // sample staff seeded in db.js
        period: 'daily',
        period_date: today,
        orders_threshold: 40,
        reward_amount: 5000.00,
        title: 'Incentive Target',
        note: 'Reach 100% of the target',
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('incentive_targets', null, {});
  },
};
