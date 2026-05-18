const fs = require('fs');
const path = 'src/routes/admin.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Update variables in getStaffStats
content = content.replace(
    'let totalDurationMin = 0, totalOtMin = 0, otFullDays = 0;',
    'let totalDurationMin = 0, totalOtMin = 0, otFullDays = 0, extraPresent = 0;'
);

// 2. Logic to detect extra present inside the loop
// We need to find the if (att) block.
const attBlockStart = 'if (att) {';
const attBlockIndex = content.indexOf(attBlockStart);

if (attBlockIndex !== -1) {
    // We want to insert the check inside if (att)
    const insertIndex = content.indexOf('const statusCode = toStatusCode(att);', attBlockIndex);
    const checkLogic = `
          // Check for Extra Present (Working on WO or Holiday)
          let isExtra = false;
          if (checkIsWeeklyOff(sId, dStr)) {
            isExtra = true;
          } else {
            for (const asg of userHolAsg) {
              if (dStr >= dayjs(asg.effectiveFrom).format('YYYY-MM-DD') && (!asg.effectiveTo || dStr <= dayjs(asg.effectiveTo).format('YYYY-MM-DD'))) {
                if (asg.template?.holidays?.some(hd => hd.date === dStr)) { isExtra = true; break; }
              }
            }
          }
          if (isExtra) extraPresent++;
`;
    content = content.substring(0, insertIndex) + checkLogic + content.substring(insertIndex);
}

// 3. Update return
content = content.replace(
    'return { present, absent, wo, holiday, leave, totalDurationMin, totalOtMin, otFullDays, otResultsMap, lateDays, earlyDays };',
    'return { present, absent, wo, holiday, leave, totalDurationMin, totalOtMin, otFullDays, otResultsMap, extraPresent, lateDays, earlyDays };'
);

// 4. Update summary text
content = content.replace(
    'Leaves Taken: ${stats.leave}`',
    'Leaves Taken: ${stats.leave}  Extra Present: ${stats.extraPresent}`'
);

fs.writeFileSync(path, content);
console.log('Successfully updated extra present logic in src/routes/admin.js');
