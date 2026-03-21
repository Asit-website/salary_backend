const { sequelize, User, Attendance, Activity, StaffProfile, SalaryTemplate, SalaryForecast, AIAnomaly } = require('./src/models');
const { Op } = require('sequelize');
const dayjs = require('dayjs');
const aiProvider = require('./src/services/aiProvider');

async function testCompute() {
  try {
    const month = 3;
    const year = 2026;
    const orgAccountId = 1; // Assuming 1 for testing

    const startDate = dayjs(`${year}-${month}-01`).startOf('month').format('YYYY-MM-DD');
    const endDate = dayjs(`${year}-${month}-01`).endOf('month').format('YYYY-MM-DD');

    const users = await User.findAll({ 
      where: { role: 'staff' }, // Simplified for test
      include: [
        { model: StaffProfile, as: 'profile' },
        { model: SalaryTemplate, as: 'salaryTemplate' }
      ],
      limit: 2
    });

    console.log(`Testing compute for ${users.length} users...`);

    const stats = await Promise.all(users.map(async (u) => {
      const [present, absent, halfDay, lateCount, totalTasks, closedTasks] = await Promise.all([
        Attendance.count({ where: { userId: u.id, date: { [Op.between]: [startDate, endDate] }, status: 'Present' } }),
        Attendance.count({ where: { userId: u.id, date: { [Op.between]: [startDate, endDate] }, status: 'Absent' } }),
        Attendance.count({ where: { userId: u.id, date: { [Op.between]: [startDate, endDate] }, status: 'Half Day' } }),
        Attendance.count({ where: { userId: u.id, date: { [Op.between]: [startDate, endDate] }, late: true } }),
        Activity.count({ where: { userId: u.id, date: { [Op.between]: [startDate, endDate] } } }),
        Activity.count({ where: { userId: u.id, date: { [Op.between]: [startDate, endDate] }, status: 'CLOSED' } })
      ]);

      return {
        id: u.id,
        name: u.profile?.name || u.phone,
        present, absent, halfDay,
        totalTasks, closedTasks
      };
    }));

    console.log('Gathered Stats:', JSON.stringify(stats, null, 2));

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

testCompute();
