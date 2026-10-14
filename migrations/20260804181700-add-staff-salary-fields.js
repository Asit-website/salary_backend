'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('users').catch(() => ({}));
    const addIfMissing = async (name, def) => {
      if (!table[name]) await queryInterface.addColumn('users', name, def);
    };

    const decimal = { type: Sequelize.DECIMAL(10, 2), allowNull: true, defaultValue: 0 };

    await addIfMissing('basic_salary', decimal);
    await addIfMissing('hra', decimal);
    await addIfMissing('da', decimal);
    await addIfMissing('special_allowance', decimal);
    await addIfMissing('conveyance_allowance', decimal);
    await addIfMissing('medical_allowance', decimal);
    await addIfMissing('telephone_allowance', decimal);
    await addIfMissing('other_allowances', decimal);
    await addIfMissing('total_earnings', decimal);
    await addIfMissing('pf_deduction', decimal);
    await addIfMissing('esi_deduction', decimal);
    await addIfMissing('professional_tax', decimal);
    await addIfMissing('tds_deduction', decimal);
    await addIfMissing('other_deductions', decimal);
    await addIfMissing('total_deductions', decimal);
    await addIfMissing('gross_salary', decimal);
    await addIfMissing('net_salary', decimal);
    await addIfMissing('salary_last_calculated', { type: Sequelize.DATE, allowNull: true });
  },

  down: async (queryInterface) => {
    const cols = [
      'basic_salary', 'hra', 'da', 'special_allowance', 'conveyance_allowance',
      'medical_allowance', 'telephone_allowance', 'other_allowances', 'total_earnings',
      'pf_deduction', 'esi_deduction', 'professional_tax', 'tds_deduction', 'other_deductions',
      'total_deductions', 'gross_salary', 'net_salary', 'salary_last_calculated',
    ];
    const table = await queryInterface.describeTable('users').catch(() => ({}));
    for (const col of cols) {
      if (table[col]) await queryInterface.removeColumn('users', col);
    }
  },
};
