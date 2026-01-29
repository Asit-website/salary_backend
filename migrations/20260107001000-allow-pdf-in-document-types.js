module.exports = {
  async up(queryInterface) {
    // Since we don't enforce allowed_mime on backend yet, this is informational.
    // Update seeded defaults to allow PDF as well.
    await queryInterface.sequelize.query(
      "UPDATE document_types SET allowed_mime = 'image/*,application/pdf' WHERE `key` IN ('aadhaar','pan','photo','bank_passbook')"
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      "UPDATE document_types SET allowed_mime = 'image/*' WHERE `key` IN ('aadhaar','pan','photo','bank_passbook')"
    );
  },
};
