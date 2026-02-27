'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('appraisals', 'effective_from', {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });
    await queryInterface.addIndex('appraisals', ['org_account_id', 'effective_from'], {
      name: 'ix_appraisals_org_effective_from',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('appraisals', 'ix_appraisals_org_effective_from');
    await queryInterface.removeColumn('appraisals', 'effective_from');
  },
};

