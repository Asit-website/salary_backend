'use strict';

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const rows = [
      {
        name: 'Sample Client Two',
        phone: '9876543211',
        client_type: 'Distributor',
        location: 'Thane, Maharashtra',
        extra: JSON.stringify({ source: 'seed' }),
        created_by: 1,
        created_at: now,
        updated_at: now,
      },
      {
        name: 'Sample Client Three',
        phone: '9876501234',
        client_type: 'Wholesaler',
        location: 'Navi Mumbai, Maharashtra',
        extra: JSON.stringify({ source: 'seed' }),
        created_by: 1,
        created_at: now,
        updated_at: now,
      },
    ];

    await queryInterface.bulkInsert('clients', rows);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('clients', {
      name: ['Sample Client Two', 'Sample Client Three'],
    });
  },
};
