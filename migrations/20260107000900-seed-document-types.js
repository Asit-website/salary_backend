module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const rows = [
      {
        key: 'aadhaar',
        name: 'Aadhaar Card',
        required: true,
        active: true,
        allowed_mime: 'image/*',
        created_at: now,
        updated_at: now,
      },
      {
        key: 'pan',
        name: 'PAN Card',
        required: true,
        active: true,
        allowed_mime: 'image/*',
        created_at: now,
        updated_at: now,
      },
      {
        key: 'photo',
        name: 'Passport Size Photo',
        required: true,
        active: true,
        allowed_mime: 'image/*',
        created_at: now,
        updated_at: now,
      },
      {
        key: 'bank_passbook',
        name: 'Bank Passbook / Cancelled Cheque',
        required: false,
        active: true,
        allowed_mime: 'image/*',
        created_at: now,
        updated_at: now,
      },
    ];

    for (const r of rows) {
      // Insert only if key doesn't already exist
      const [existing] = await queryInterface.sequelize.query(
        'SELECT id FROM document_types WHERE `key` = :key LIMIT 1',
        { replacements: { key: r.key } }
      );
      if (!Array.isArray(existing) || existing.length === 0) {
        await queryInterface.bulkInsert('document_types', [r]);
      }
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('document_types', {
      key: ['aadhaar', 'pan', 'photo', 'bank_passbook'],
    });
  },
};
