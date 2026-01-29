'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    const today = new Date();
    const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

    const rows = [
      {
        client_id: 2,
        staff_user_id: 2,
        title: 'Follow-up Visit',
        description: 'Discuss pricing, confirm requirements, collect feedback.',
        status: 'pending',
        assigned_on: today,
        due_date: addDays(today, 2),
        created_at: now,
        updated_at: now,
      },
      {
        client_id: 3,
        staff_user_id: 2,
        title: 'First Visit',
        description: 'Product demo and order discussion.',
        status: 'pending',
        assigned_on: today,
        due_date: addDays(today, 3),
        created_at: now,
        updated_at: now,
      },
    ];

    await queryInterface.bulkInsert('assigned_jobs', rows);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('assigned_jobs', {
      title: ['Follow-up Visit', 'First Visit'],
      staff_user_id: 2,
    });
  },
};
