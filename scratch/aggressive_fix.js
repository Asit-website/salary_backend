const fs = require('fs');
const path = 'src/routes/admin.js';
let content = fs.readFileSync(path, 'utf8');

const regex = /\/\/ Apply User's requested OT logic[\s\S]+?otResultsMap\[dStr\] = { minutes: otRes\.overtimeMinutes, isFullDay: false };\s*}/;

if (!regex.test(content)) {
    console.error('Regex did not match!');
    process.exit(1);
}

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
console.log('Successfully updated src/routes/admin.js');
