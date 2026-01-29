"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "salary_values", {
      type: Sequelize.JSON,
      allowNull: true,
      after: "salary_template_id",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("users", "salary_values");
  },
};
