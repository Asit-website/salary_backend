const { Attendance } = require('./src/models');
const earlyExitService = require('./src/services/earlyExitService');
const latePunchInService = require('./src/services/latePunchInService');
const overtimeService = require('./src/services/overtimeService');

async function fixAsitAttendance() {
  const userId = 57;
  const date = '2026-05-12';
  
  try {
    console.log(`Fixing attendance for User ${userId} on ${date}...`);
    
    const attendance = await Attendance.findOne({ where: { userId, date } });
    if (!attendance) {
      console.log('No attendance record found.');
      return;
    }

    // Re-calculate Early Exit
    const earlyExitResult = await earlyExitService.calculateEarlyExit(attendance, { earlyExitRuleId: attendance.earlyExitRuleId });
    
    // Re-calculate Late Punch-In
    const latePunchInResult = await latePunchInService.calculateLatePenalty(attendance, { latePunchInRuleId: attendance.latePunchInRuleId });
    
    // Re-calculate Overtime
    const overtimeResult = await overtimeService.calculateOvertime(attendance);

    console.log('Calculated values:');
    console.log(`  Early Exit: ${earlyExitResult.earlyExitMinutes} mins, Deduction: ${earlyExitResult.earlyExitAmount}`);
    console.log(`  Late Punch-In: ${latePunchInResult.latePunchInMinutes} mins, Amount: ${latePunchInResult.latePunchInAmount}`);
    console.log(`  Overtime: ${overtimeResult.overtimeMinutes} mins, Amount: ${overtimeResult.overtimeAmount}`);

    // Update Attendance
    await attendance.update({
      earlyExitMinutes: earlyExitResult.earlyExitMinutes,
      earlyExitAmount: earlyExitResult.earlyExitAmount,
      latePunchInMinutes: latePunchInResult.latePunchInMinutes,
      latePunchInAmount: latePunchInResult.latePunchInAmount,
      overtimeMinutes: overtimeResult.overtimeMinutes,
      overtimeAmount: overtimeResult.overtimeAmount,
      isLate: latePunchInResult.isLate,
      status: overtimeResult.status || attendance.status
    });

    console.log('Attendance record updated successfully.');
  } catch (error) {
    console.error('Error fixing attendance:', error);
  } finally {
    process.exit();
  }
}

fixAsitAttendance();
