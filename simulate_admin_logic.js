const axios = require('axios');

async function testAdminAttendance() {
  const date = '2026-05-12';
  const orgId = 15; // From the logs earlier, Asit's org seems to be 15? No, let's find it.
  
  // Actually, I can just use the DB to find the orgId for Asit.
  const { User } = require('./src/models');
  const user = await User.findByPk(57);
  const orgAccountId = user.orgAccountId;
  
  console.log(`Testing admin attendance for org ${orgAccountId} on ${date}...`);
  
  // We need an admin token. I'll just mock the request context if I were inside the app, 
  // but here I'll just run a node script that calls the logic directly if possible, 
  // or I'll just use the already running process and hope I can see output.
  
  // Better: I'll use a script that imports the route handler logic or just queries the DB 
  // and simulates the map logic to see what's happening.
}

// Re-simulating the logic in admin.js for Asit
async function simulateAdminLogic() {
  const { Attendance, User, StaffProfile, StaffShiftAssignment, ShiftTemplate, StaffRoster } = require('./src/models');
  const r = await Attendance.findOne({ 
    where: { userId: 57, date: '2026-05-12' },
    include: [{ model: User, as: 'user', include: [{ model: StaffProfile, as: 'profile' }] }]
  });
  
  if (!r) {
    console.log('No attendance record found for simulation.');
    return;
  }

  const shiftAssignments = await StaffShiftAssignment.findAll({
    where: { userId: [r.userId] },
    include: [{ model: ShiftTemplate, as: 'template' }],
    order: [['effectiveFrom', 'DESC']]
  });

  const dayShiftAsg = shiftAssignments.find(asg => asg.userId === r.userId && r.date >= asg.effectiveFrom && (!asg.effectiveTo || r.date <= asg.effectiveTo));
  let shiftTpl = dayShiftAsg?.template || (r.user?.shiftTemplateId ? await ShiftTemplate.findByPk(r.user.shiftTemplateId) : null);
  
  console.log(`Simulation Resolved Shift (before roster check): ${shiftTpl?.name} (${shiftTpl?.startTime}-${shiftTpl?.endTime})`);
  
  // Check if there's a roster override that this logic is MISSING
  const rosterEntry = await StaffRoster.findOne({ where: { userId: r.userId, date: r.date } });
  if (rosterEntry && rosterEntry.shiftTemplateId) {
    const rosterShift = await ShiftTemplate.findByPk(rosterEntry.shiftTemplateId);
    console.log(`ROSTER OVERRIDE FOUND: ${rosterShift.name} (${rosterShift.startTime}-${rosterShift.endTime})`);
  } else {
    console.log('No roster override found.');
  }
}

simulateAdminLogic().then(() => process.exit());
