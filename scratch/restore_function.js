const fs = require('fs');
const path = 'src/routes/admin.js';
let content = fs.readFileSync(path, 'utf8');

const startMarker = '// HELPER: Calculate statistics for a staff member';
const endMarker = 'return { present, absent, wo, holiday, leave, totalDurationMin, totalOtMin, otFullDays, otResultsMap, lateDays, earlyDays };\n    };';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
    console.error('Markers not found!');
    process.exit(1);
}

const newFunction = `// HELPER: Calculate statistics for a staff member
    const getStaffStats = async (staffId) => {
      const sId = String(staffId);
      let present = 0, absent = 0, wo = 0, holiday = 0, leave = 0;
      let totalDurationMin = 0, totalOtMin = 0, otFullDays = 0;
      const otResultsMap = {};
      let lateDays = 0, earlyDays = 0;
      const userHolAsg = holidayAssignments.filter(a => String(a.userId) === sId);


      for (let i = 1; i <= daysInMonth; i++) {
        const dStr = startDate.clone().date(i).format('YYYY-MM-DD');
        const att = attendanceMap[sId]?.[dStr];

        if (att) {
          const statusCode = toStatusCode(att);
          const s = (statusCode || '').toLowerCase();
          if (['p', 'hd'].includes(s)) present++;
          else if (s === 'a') absent++;
          else if (s === 'l') leave++;

          if (att.punchedInAt && att.punchedOutAt) {
            const diff = dayjs(att.punchedOutAt).diff(dayjs(att.punchedInAt), 'minute');
            totalDurationMin += diff;
          }
          
          // Apply User's requested OT logic
          const otRes = await calculateOvertime(att, org, daysInMonth, att.punchedOutAt || null);
          // Trust the saved overtimeMinutes for consistency with the status row
          const savedOtMins = Number(att.overtimeMinutes || 0);
          if (otRes.fullDayOvertimeApplied) {
            otFullDays++;
            otResultsMap[dStr] = { minutes: 0, isFullDay: true, actualMinutes: savedOtMins };
          } else {
            totalOtMin += savedOtMins;
            otResultsMap[dStr] = { minutes: savedOtMins, isFullDay: false };
          }

          const shiftTpl = shiftService.resolveShift(sId, dStr, shiftContext);
          if (shiftTpl) {
            if (att.punchedInAt && shiftTpl.startTime) {
              const istPunchIn = new Date(att.punchedInAt.getTime() + (5.5 * 3600 * 1000));
              const punchInSec = istPunchIn.getUTCHours() * 3600 + istPunchIn.getUTCMinutes() * 60 + istPunchIn.getUTCSeconds();
              const [sh, sm, ss] = shiftTpl.startTime.split(':').map(Number);
              const shiftStartSec = sh * 3600 + sm * 60 + (ss || 0);
              if (punchInSec > shiftStartSec) lateDays++;
            }
            if (att.punchedOutAt && shiftTpl.endTime) {
              const istPunchOut = new Date(att.punchedOutAt.getTime() + (5.5 * 3600 * 1000));
              const punchOutSec = istPunchOut.getUTCHours() * 3600 + istPunchOut.getUTCMinutes() * 60 + istPunchOut.getUTCSeconds();
              const [eh, em, es] = shiftTpl.endTime.split(':').map(Number);
              const shiftEndSec = eh * 3600 + em * 60 + (es || 0);
              if (punchOutSec < shiftEndSec) earlyDays++;
            }
          }
        } else {
          const isL = leaveMap[sId]?.find(l => {
            const s = dayjs(l.startDate).format('YYYY-MM-DD');
            const e = dayjs(l.endDate).format('YYYY-MM-DD');
            return (dStr >= s && dStr <= e);
          });
          let isH = false;
          for (const asg of userHolAsg) {
            if (dStr >= dayjs(asg.effectiveFrom).format('YYYY-MM-DD') && (!asg.effectiveTo || dStr <= dayjs(asg.effectiveTo).format('YYYY-MM-DD'))) {
              if (asg.template?.holidays?.some(hd => hd.date === dStr)) { isH = true; break; }
            }
          }
          if (isL) leave++;
          else if (isH) holiday++;
          else if (checkIsWeeklyOff(sId, dStr)) wo++;
          else absent++;
        }
      }
      return { present, absent, wo, holiday, leave, totalDurationMin, totalOtMin, otFullDays, otResultsMap, lateDays, earlyDays };
    };`;

content = content.substring(0, startIndex) + newFunction + content.substring(endIndex + endMarker.length);
fs.writeFileSync(path, content);
console.log('Successfully restored getStaffStats in src/routes/admin.js');
