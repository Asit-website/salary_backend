const { Op } = require('sequelize');
const { PayrollCycle, PayrollLine } = require('../models');

/**
 * Months where org payroll was generated (LOCKED/PAID or any line exists).
 * Matches payroll compute in admin.js.
 */
async function loadGeneratedPayrollMonths(orgId) {
  const existingCycles = await PayrollCycle.findAll({
    where: {
      orgAccountId: orgId,
      [Op.or]: [
        { status: { [Op.in]: ['LOCKED', 'PAID'] } },
        { '$lines.id$': { [Op.ne]: null } },
      ],
    },
    include: [
      {
        model: PayrollLine,
        as: 'lines',
        attributes: ['id'],
        required: false,
      },
    ],
    attributes: ['monthKey'],
  });
  return new Set(existingCycles.map((c) => c.monthKey));
}

function parseDeductionsList(adv) {
  if (!adv?.deductions) return null;
  let parsed = adv.deductions;
  while (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      break;
    }
  }
  return Array.isArray(parsed) ? parsed : null;
}

/**
 * Same rules as payroll cycle compute (admin.js): outstanding before month + EMI for monthKey.
 */
function computeStaffAdvancePayroll(staffAdvances, monthKey, generatedMonths = new Set()) {
  let advanceDeductions = 0;
  let totalOutstandingAdvance = 0;
  const perAdvance = [];

  for (const adv of staffAdvances || []) {
    if (adv.status === 'cancelled') continue;

    const deductionsList = parseDeductionsList(adv);
    const advAmount = Number(adv.amount || 0);
    let outstandingBefore = 0;
    let deductionThisMonth = 0;

    if (deductionsList && deductionsList.length > 0) {
      const completedDeductionsSum = deductionsList
        .filter(
          (d) =>
            d.status === 'deducted' ||
            (monthKey && d.month < monthKey && generatedMonths.has(d.month)),
        )
        .reduce((sum, d) => sum + Number(d.amount || 0), 0);

      outstandingBefore = Math.max(0, advAmount - completedDeductionsSum);
      totalOutstandingAdvance += outstandingBefore;

      if (monthKey) {
        const scheduledForThisMonth = deductionsList.find((d) => d.month === monthKey);
        if (scheduledForThisMonth && scheduledForThisMonth.status !== 'deducted') {
          deductionThisMonth = Number(scheduledForThisMonth.amount || 0);
          advanceDeductions += deductionThisMonth;
        }
      }
    } else {
      let isDeducted = adv.status === 'deducted';
      if (
        adv.status === 'pending' &&
        adv.deductionMonth &&
        monthKey &&
        adv.deductionMonth < monthKey &&
        generatedMonths.has(adv.deductionMonth)
      ) {
        isDeducted = true;
      }

      if (!isDeducted) {
        outstandingBefore = advAmount;
        totalOutstandingAdvance += advAmount;
        if (monthKey && adv.deductionMonth === monthKey) {
          deductionThisMonth = advAmount;
          advanceDeductions += advAmount;
        }
      } else if (monthKey && adv.deductionMonth === monthKey) {
        outstandingBefore = advAmount;
        totalOutstandingAdvance += advAmount;
        deductionThisMonth = advAmount;
        advanceDeductions += advAmount;
      }
    }

    perAdvance.push({
      id: adv.id,
      amount: advAmount,
      advanceDate: adv.advanceDate,
      status: adv.status,
      deductionMonth: adv.deductionMonth,
      deductions: adv.deductions,
      outstandingBeforeMonth: outstandingBefore,
      deductionThisMonth,
    });
  }

  return {
    advanceDeductions,
    totalOutstandingAdvance,
    perAdvance,
  };
}

/** Legacy simple outstanding (sum remaining on each advance). */
function advanceOutstandingSimple(advances) {
  return (advances || []).reduce((sum, adv) => {
    const total = Number(adv.amount || 0);
    const deductionsList = parseDeductionsList(adv);
    if (!deductionsList || deductionsList.length === 0) {
      return sum + (adv.status === 'deducted' ? 0 : total);
    }
    const deducted = deductionsList
      .filter((d) => d.status === 'deducted')
      .reduce((s, d) => s + Number(d.amount || 0), 0);
    return sum + Math.max(0, total - deducted);
  }, 0);
}

module.exports = {
  loadGeneratedPayrollMonths,
  computeStaffAdvancePayroll,
  advanceOutstandingSimple,
  parseDeductionsList,
};
