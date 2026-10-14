require('dotenv').config();
const { User, StaffProfile, PayrollCycle, PayrollLine } = require('../src/models');
const { calculateSalary } = require('../src/services/payrollService');

(async () => {
  const prof = await StaffProfile.findOne({ where: { staffId: 'FT11' } });
  if (!prof) {
    console.log('no profile FT11');
    process.exit(1);
  }
  const u = await User.findByPk(prof.userId);
  console.log('user', u.id, 'org', u.orgAccountId);
  const mk = '2026-09';
  const cycles = await PayrollCycle.findAll({ where: { orgAccountId: u.orgAccountId, monthKey: mk } });
  console.log('cycles', cycles.length);
  for (const c of cycles) {
    const line = await PayrollLine.findOne({ where: { cycleId: c.id, userId: u.id } });
    console.log('cycle', c.id, 'status', c.status, 'line', line?.id);
  }
  try {
    const r = await calculateSalary(u.id, mk);
    const a = r.attendanceSummary || {};
    console.log('calc', {
      present: a.payableDays ?? a.present,
      absent: a.absent,
      otMin: a.overtimeMinutes,
      net: r.totals?.netSalary,
    });
  } catch (e) {
    console.error('calc err', e.message);
  }
  // inline snapshot after fix
  const orgId = u.orgAccountId;
  const userId = u.id;
  const monthKey = mk;
  let projected = null;
  try {
    projected = await calculateSalary(userId, monthKey);
  } catch (e) {
    console.error(e.message);
  }
  const att = projected?.attendanceSummary || {};
  const totals = projected?.totals || {};
  console.log('snapshot-like', {
    present: att.payableDays ?? att.present,
    absent: att.absent,
    otMin: att.overtimeMinutes,
    net: totals.netSalary,
    late: att.lateCount,
  });
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
