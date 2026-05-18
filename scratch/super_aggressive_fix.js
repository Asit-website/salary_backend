const fs = require('fs');
const path = 'src/routes/admin.js';
let content = fs.readFileSync(path, 'utf8');

const targetStr = 'const otRes = await calculateOvertime(att, org, daysInMonth, att.punchedOutAt || null);';
const index = content.indexOf(targetStr);

if (index === -1) {
    console.error('Target string not found!');
    process.exit(1);
}

// Find the end of the block (the next '}')
let endOfBlock = content.indexOf('}', index); // first } after if
endOfBlock = content.indexOf('}', endOfBlock + 1); // second } after else

const blockToReplace = content.substring(index - 10, endOfBlock + 1);

const replacement = `const otRes = await calculateOvertime(att, org, daysInMonth, att.punchedOutAt || null);
          // Trust the saved overtimeMinutes for consistency with the status row
          const savedOtMins = Number(att.overtimeMinutes || 0);
          if (otRes.fullDayOvertimeApplied) {
            otFullDays++;
            otResultsMap[dStr] = { minutes: 0, isFullDay: true, actualMinutes: savedOtMins };
          } else {
            totalOtMin += savedOtMins;
            otResultsMap[dStr] = { minutes: savedOtMins, isFullDay: false };
          }`;

content = content.replace(blockToReplace, replacement);
fs.writeFileSync(path, content);
console.log('Successfully updated src/routes/admin.js');
