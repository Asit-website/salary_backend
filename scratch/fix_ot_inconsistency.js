const fs = require('fs');
const path = 'src/routes/admin.js';
let content = fs.readFileSync(path, 'utf8');

const target = `          // Apply User's requested OT logic
          const otRes = await calculateOvertime(att, org, daysInMonth, att.punchedOutAt || null);
          if (otRes.fullDayOvertimeApplied) {
            otFullDays++;
            otResultsMap[dStr] = { minutes: 0, isFullDay: true, actualMinutes: otRes.overtimeMinutes };
          } else {
            totalOtMin += (otRes.overtimeMinutes || 0);
            otResultsMap[dStr] = { minutes: otRes.overtimeMinutes, isFullDay: false };
          }`;

const replacement = `          // Apply User's requested OT logic
          const otRes = await calculateOvertime(att, org, daysInMonth, att.punchedOutAt || null);
          // Trust the saved overtimeMinutes for consistency with the status row
          const savedOtMins = Number(att.overtimeMinutes || 0);
          if (otRes.fullDayOvertimeApplied) {
            otFullDays++;
            otResultsMap[dStr] = { minutes: 0, isFullDay: true, actualMinutes: savedOtMins };
          } else {
            totalOtMin += savedOtMins;
            otResultsMap[dStr] = { minutes: savedOtMins, isFullDay: false };
          }`;

if (content.indexOf(target) === -1) {
    console.error('Target not found exactly. Trying regex...');
    const regex = /\/\/ Apply User's requested OT logic[\s\S]*?otResultsMap\[dStr\] = { minutes: otRes\.overtimeMinutes, isFullDay: false };\s*}/;
    const regexReplacement = `// Apply User's requested OT logic
          const otRes = await calculateOvertime(att, org, daysInMonth, att.punchedOutAt || null);
          // Trust the saved overtimeMinutes for consistency with the status row
          const savedOtMins = Number(att.overtimeMinutes || 0);
          if (otRes.fullDayOvertimeApplied) {
            otFullDays++;
            otResultsMap[dStr] = { minutes: 0, isFullDay: true, actualMinutes: savedOtMins };
          } else {
            totalOtMin += savedOtMins;
            otResultsMap[dStr] = { minutes: savedOtMins, isFullDay: false };
          }`;
    content = content.replace(regex, regexReplacement);
    fs.writeFileSync(path, content);
    console.log('Successfully updated src/routes/admin.js using regex');
} else {
    content = content.replace(target, replacement);
    fs.writeFileSync(path, content);
    console.log('Successfully fixed OT inconsistency in src/routes/admin.js');
}
