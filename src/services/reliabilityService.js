const { Op } = require('sequelize');
const dayjs = require('dayjs');
const { 
  User, StaffProfile, Attendance, Activity, Ticket, Meeting, 
  MeetingAttendee, AssignedJob, SalesVisit, Order, ShiftTemplate, 
  StaffShiftAssignment 
} = require('../models');

/**
 * Calculate Work Reliability Score (0-100)
 * Weights:
 * 1. Attendance Consistency: 30%
 * 2. Punctuality: 20%
 * 3. Task Completion (Activity, Ticket, Meeting): 25%
 * 4. Operational Forms (Job, Visit, Order): 25%
 */
class ReliabilityService {
  async calculateScores(orgAccountId, month, year) {
    const startDate = dayjs(`${year}-${month}-01`).startOf('month');
    const endDate = dayjs(`${year}-${month}-01`).endOf('month');
    const today = dayjs();
    const calculationEndDate = today.isBefore(endDate) ? today : endDate;
    const elapsedDays = calculationEndDate.date();

    // 1. Fetch all active staff
    const users = await User.findAll({
      where: { orgAccountId, role: 'staff', active: true },
      include: [{ model: StaffProfile, as: 'profile' }]
    });

    const results = [];

    for (const user of users) {
      const userId = user.id;

      // --- 1. Attendance Consistency (30%) ---
      const attendanceRecords = await Attendance.findAll({
        where: { userId, date: { [Op.between]: [startDate.format('YYYY-MM-DD'), calculationEndDate.format('YYYY-MM-DD')] } }
      });

      const presentDays = attendanceRecords.filter(r => ['present', 'overtime'].includes(r.status?.toLowerCase())).length;
      const halfDays = attendanceRecords.filter(r => r.status?.toLowerCase() === 'half_day').length;
      
      // Rough estimate of working days excluding Sundays (simple logic for now)
      let expectedWorkingDays = 0;
      for (let d = 1; d <= elapsedDays; d++) {
        const dt = startDate.date(d);
        if (dt.day() !== 0) expectedWorkingDays++; // Not Sunday
      }
      if (expectedWorkingDays === 0) expectedWorkingDays = 1;

      const attendanceScore = Math.min(100, ((presentDays + 0.5 * halfDays) / expectedWorkingDays) * 100);

      // --- 2. Punctuality (20%) ---
      // Fetch shift assignments to know start time
      const shiftAsg = await StaffShiftAssignment.findOne({
        where: { userId, effectiveFrom: { [Op.lte]: calculationEndDate.format('YYYY-MM-DD') } },
        include: [{ model: ShiftTemplate, as: 'template' }],
        order: [['effectiveFrom', 'DESC']]
      });

      let punctualityScore = 100;
      const punchIns = attendanceRecords.filter(r => r.punchedInAt);
      if (punchIns.length > 0 && shiftAsg?.template?.startTime) {
        let onTimeCount = 0;
        const [sh, sm] = shiftAsg.template.startTime.split(':').map(Number);
        const shiftStartMinutes = sh * 60 + sm;

        for (const record of punchIns) {
          const punchIn = dayjs(record.punchedInAt).add(5.5, 'hour'); // Adjust for IST if stored in UTC
          const punchInMinutes = punchIn.hour() * 60 + punchIn.minute();
          if (punchInMinutes <= shiftStartMinutes + 15) { // 15 mins grace period
            onTimeCount++;
          }
        }
        punctualityScore = (onTimeCount / punchIns.length) * 100;
      } else if (punchIns.length === 0 && presentDays > 0) {
        punctualityScore = 0; // Present but no punch-in data?
      }

      // --- 3. Task Completion (25%) ---
      const [activities, tickets, meetings] = await Promise.all([
        Activity.findAll({ where: { userId, date: { [Op.between]: [startDate.format('YYYY-MM-DD'), calculationEndDate.format('YYYY-MM-DD')] } } }),
        Ticket.findAll({ where: { allocatedTo: userId, createdAt: { [Op.between]: [startDate.toDate(), calculationEndDate.toDate()] } } }),
        MeetingAttendee.findAll({ 
          where: { userId },
          include: [{ model: Meeting, as: 'meeting', where: { scheduledAt: { [Op.between]: [startDate.toDate(), calculationEndDate.toDate()] } } }]
        })
      ]);

      const totalTasks = activities.length + tickets.length + meetings.length;
      const completedTasks = 
        activities.filter(a => a.status === 'DONE' || a.isClosed).length +
        tickets.filter(t => t.status === 'DONE' || t.isClosed).length +
        meetings.filter(m => m.meeting?.status === 'DONE' || m.meeting?.isClosed).length;

      const taskScore = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 100;

      // --- 4. Operational Forms (25%) ---
      const [jobs, visits, orders] = await Promise.all([
        AssignedJob.findAll({ where: { staffUserId: userId, createdAt: { [Op.between]: [startDate.toDate(), calculationEndDate.toDate()] } } }),
        SalesVisit.findAll({ where: { userId, createdAt: { [Op.between]: [startDate.toDate(), calculationEndDate.toDate()] } } }),
        Order.findAll({ where: { userId, createdAt: { [Op.between]: [startDate.toDate(), calculationEndDate.toDate()] } } })
      ]);

      const totalOps = jobs.length + visits.length + orders.length;
      const completedOps = 
        jobs.filter(j => j.status === 'complete').length +
        visits.length +
        orders.length;

      const opsScore = totalOps > 0 ? (completedOps / totalOps) * 100 : 0;

      // --- 5. Final Dynamic Weighted Score ---
      let totalWeight = 0;
      let weightedSum = 0;

      // Attendance always has data (expected working days)
      const attWeight = 30;
      totalWeight += attWeight;
      weightedSum += (attendanceScore * attWeight);

      // Punctuality only counted if they have punch-ins
      if (punchIns.length > 0) {
        const puncWeight = 20;
        totalWeight += puncWeight;
        weightedSum += (punctualityScore * puncWeight);
      }

      // Tasks only counted if assigned
      if (totalTasks > 0) {
        const taskWeight = 25;
        totalWeight += taskWeight;
        weightedSum += (taskScore * taskWeight);
      }

      // Operations only counted if assigned
      if (totalOps > 0) {
        const opsWeight = 25;
        totalWeight += opsWeight;
        weightedSum += (opsScore * opsWeight);
      }

      const finalScore = totalWeight > 0 ? (weightedSum / totalWeight) : 0;

      results.push({
        userId,
        userName: user.profile?.name || user.phone,
        designation: user.profile?.designation,
        score: Math.round(finalScore * 10) / 10,
        breakdown: {
          attendanceConsistency: Math.round(attendanceScore),
          punctuality: punchIns.length > 0 ? Math.round(punctualityScore) : 0,
          taskCompletion: totalTasks > 0 ? Math.round(taskScore) : 0,
          operationalForms: totalOps > 0 ? Math.round(opsScore) : 0
        },
        metrics: {
          presentDays,
          totalTasks,
          completedTasks,
          totalOps,
          completedOps
        }
      });
    }

    // Sort by score descending and get top 10
    results.sort((a, b) => b.score - a.score);
    return results;
  }
}

module.exports = new ReliabilityService();
