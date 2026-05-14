const { Attendance, StaffRoster, ShiftTemplate } = require('./src/models');
const shiftService = require('./src/services/shiftService');
const earlyExitService = require('./src/services/earlyExitService');
const latePunchInService = require('./src/services/latePunchInService');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

async function debugAsitAttendance() {
  const userId = 57;
  const date = '2026-05-12';
  
  try {
    console.log(`--- Debugging Attendance for User ${userId} on ${date} ---`);
    
    // 1. Get Attendance Record
    const attendance = await Attendance.findOne({
      where: { userId, date }
    });
    
    if (!attendance) {
      console.log('No attendance record found for this date.');
    } else {
      console.log('Attendance Record:');
      console.log(`  Punched In (raw): ${attendance.punchedInAt}`);
      console.log(`  Punched Out (raw): ${attendance.punchedOutAt}`);
      console.log(`  Early Exit (persisted): ${attendance.earlyExitMinutes}`);
      console.log(`  Late Punch-In (persisted): ${attendance.latePunchInMinutes}`);
    }

    // 2. Get Effective Shift
    const shift = await shiftService.getEffectiveShiftTemplate(userId, date);
    if (!shift) {
      console.log('No effective shift found.');
    } else {
      console.log('Effective Shift:');
      console.log(`  Name: ${shift.name}`);
      console.log(`  Start Time: ${shift.startTime}`);
      console.log(`  End Time: ${shift.endTime}`);
    }

    // 3. Re-calculate Early Exit
    if (attendance && shift) {
      console.log('\n--- Re-calculating Early Exit ---');
      const result = await earlyExitService.calculateEarlyExit(attendance, { earlyExitRuleId: null });
      console.log(`Calculated Early Exit Minutes: ${result.earlyExitMinutes}`);
      
      console.log('\n--- Re-calculating Late Punch-In ---');
      const lateResult = await latePunchInService.calculateLatePenalty(attendance, { latePunchInRuleId: null });
      console.log(`Calculated Late Punch-In Minutes: ${lateResult.latePunchInMinutes}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

debugAsitAttendance();
