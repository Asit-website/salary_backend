const fs = require('fs');
const path = 'src/routes/admin.js';
let content = fs.readFileSync(path, 'utf8');

console.log('Original content length:', content.length);

// Helper to escape regex
const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const replaceOnce = (target, replacement) => {
  if (content.indexOf(target) === -1) {
    console.error('Target not found:', target);
    return false;
  }
  content = content.replace(target, replacement);
  return true;
};

let success = true;

success &= replaceOnce(
  'const getStaffStats = (staffId) => {',
  'const getStaffStats = async (staffId) => {'
);

success &= replaceOnce(
  'let totalDurationMin = 0, totalOtMin = 0;',
  'let totalDurationMin = 0, totalOtMin = 0, otFullDays = 0;\n      const otResultsMap = {};'
);

success &= replaceOnce(
  'totalOtMin += (att.overtimeMinutes || 0);',
  `const otRes = await calculateOvertime(att, org, daysInMonth, att.punchedOutAt || null);
          if (otRes.fullDayOvertimeApplied) {
            otFullDays++;
            otResultsMap[dStr] = { minutes: 0, isFullDay: true, actualMinutes: otRes.overtimeMinutes };
          } else {
            totalOtMin += (otRes.overtimeMinutes || 0);
            otResultsMap[dStr] = { minutes: otRes.overtimeMinutes, isFullDay: false };
          }`
);

success &= replaceOnce(
  'return { present, absent, wo, holiday, leave, totalDurationMin, totalOtMin, lateDays, earlyDays };',
  'return { present, absent, wo, holiday, leave, totalDurationMin, totalOtMin, otFullDays, otResultsMap, lateDays, earlyDays };'
);

success &= replaceOnce(
  'staffMembers.forEach((staff) => {',
  'for (const staff of staffMembers) {'
);

success &= replaceOnce(
  'const stats = getStaffStats(staff.id);',
  'const stats = await getStaffStats(staff.id);'
);

success &= replaceOnce(
  "Total OT: ${Math.floor(stats.totalOtMin / 60)}:${String(stats.totalOtMin % 60).padStart(2, '0')} Hrs.",
  "OT Hour: ${Math.floor(stats.totalOtMin / 60)}:${String(stats.totalOtMin % 60).padStart(2, '0')} Hrs.  OT Full Days: ${stats.otFullDays}"
);

success &= replaceOnce(
  "cell.value = att?.overtimeMinutes ? `${Math.floor(att.overtimeMinutes / 60)}:${String(att.overtimeMinutes % 60).padStart(2, '0')}` : '';",
  `const otRes = stats.otResultsMap[dStr];
            if (otRes && otRes.minutes > 0) {
              cell.value = \`\${Math.floor(otRes.minutes / 60)}:\${String(otRes.minutes % 60).padStart(2, '0')}\`;
            } else if (otRes && otRes.isFullDay) {
              cell.value = '0:00';
            } else {
              cell.value = '';
            }`
);

success &= replaceOnce(
  'currentRow += 10; // Next employee block',
  'currentRow += 10; // Next employee block'
);
content = content.replace(/currentRow \+= 10; \/\/ Next employee block\s*}\);/, 'currentRow += 10; // Next employee block\n    }');

if (success) {
  fs.writeFileSync(path, content);
  console.log('Successfully updated src/routes/admin.js');
} else {
  console.error('Failed to apply some replacements.');
  process.exit(1);
}
