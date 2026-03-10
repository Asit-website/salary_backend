
const { User, Attendance, StaffShiftAssignment, ShiftTemplate, AttendanceAutomationRule, StaffProfile } = require('./src/models');
const { Op } = require('sequelize');

async function debug() {
  const userId = 29; // Mukta
  const startKey = '2026-03-01';
  const endKey = '2026-03-31';

  const user = await User.findByPk(userId, { include: [{ model: StaffProfile, as: 'profile' }, { model: ShiftTemplate, as: 'shiftTemplate' }] });
  
  console.log('User Debug Info:');
  console.log('shiftTemplateId:', user.shiftTemplateId);
  console.log('profileShiftSelection:', user.profile?.shiftSelection);

  if (user.profile?.shiftSelection) {
      const tpl = await ShiftTemplate.findOne({ where: { id: Number(user.profile.shiftSelection) } });
      console.log('Shift 4 Found:', !!tpl);
      if (tpl) console.log('Shift 4 Active:', tpl.active);
  }

  const atts = await Attendance.findAll({
    where: { userId, date: { [Op.between]: [startKey, endKey] } },
    order: [['date', 'ASC']]
  });

  const rule = await AttendanceAutomationRule.findOne({
    where: { key: 'late_punchin_penalty', orgAccountId: 10, active: true }
  });
  let config = rule.config;
  if (typeof config === 'string') {
      try { config = JSON.parse(config); } catch(e) { config = JSON.parse(JSON.parse(config)); }
  }
  const grace = Number(config.lateMinutes || 15);

  console.log('Rule Config:', config);
  let totalLates = 0;

  for (const att of atts) {
    const shiftAsg = await StaffShiftAssignment.findOne({
      where: {
        userId,
        effectiveFrom: { [Op.lte]: att.date },
        [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: att.date } }]
      },
      include: [{ model: ShiftTemplate, as: 'template' }],
      order: [['effectiveFrom', 'DESC']]
    });

    let shiftTpl = shiftAsg?.template || user.shiftTemplate;
    if (!shiftTpl && user.profile?.shiftSelection) {
        shiftTpl = await ShiftTemplate.findOne({ where: { id: Number(user.profile.shiftSelection), active: true } });
    }

    let isLate = false;
    let punchInIST = 'N/A';
    let shiftStartSec = 'N/A';
    let punchInSec = 'N/A';

    if (att.punchedInAt && shiftTpl?.startTime) {
      const punchIn = new Date(att.punchedInAt);
      const istDate = new Date(punchIn.getTime() + (5.5 * 3600 * 1000));
      punchInIST = istDate.toISOString();
      punchInSec = istDate.getUTCHours() * 3600 + istDate.getUTCMinutes() * 60 + istDate.getUTCSeconds();

      const [sh, sm, ss] = shiftTpl.startTime.split(':').map(Number);
      shiftStartSec = sh * 3600 + sm * 60 + (ss || 0);

      if (punchInSec > (shiftStartSec + grace * 60)) {
        isLate = true;
        totalLates++;
      }
    }

    console.log(`Date: ${att.date} | PunchedIn: ${att.punchedInAt} | Shift: ${shiftTpl?.name} (${shiftTpl?.startTime}) | Late: ${isLate}`);
  }
  console.log('Total Lates:', totalLates);
}

debug();
