const fs = require('fs');
const path = 'src/routes/admin.js';
let content = fs.readFileSync(path, 'utf8');

const target = `          // Highlight Weekly Off columns
          if (checkIsWeeklyOff(String(staff.id), dStr)) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
          }`;

const replacement = `          // Highlight Weekly Off columns (Yellow)
          if (checkIsWeeklyOff(String(staff.id), dStr)) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
          }

          // Highlight Holiday columns (Red)
          const sId = String(staff.id);
          const userHolAsg = holidayAssignments.filter(a => String(a.userId) === sId);
          let isH = false;
          for (const asg of userHolAsg) {
            if (dStr >= dayjs(asg.effectiveFrom).format('YYYY-MM-DD') && (!asg.effectiveTo || dStr <= dayjs(asg.effectiveTo).format('YYYY-MM-DD'))) {
              if (asg.template?.holidays?.some(hd => hd.date === dStr)) { isH = true; break; }
            }
          }
          if (isH) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
          }`;

if (content.indexOf(target) === -1) {
    console.error('Target not found exactly.');
    process.exit(1);
}

content = content.replace(target, replacement);
fs.writeFileSync(path, content);
console.log('Successfully updated holiday coloring in src/routes/admin.js');
