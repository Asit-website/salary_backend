const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { sequelize, User, StaffProfile, LeaveBalance, FnFSetting } = require('../src/models');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    const userId = 57; // Let's check User 57
    const orgId = 10;

    const u = await User.findOne({
      where: { id: userId, orgAccountId: orgId },
      include: [
        { association: "profile" }
      ]
    });

    if (!u) {
      console.log('User not found!');
      return;
    }

    let settings = await FnFSetting.findOne({ where: { orgAccountId: orgId } });
    if (!settings) {
      console.log('Settings not found, using default settings');
      settings = {
        leaveBasis: 'basic_da',
        leaveDivisor: 'calendar_month',
        leaveMaxDays: null,
        noticeBasis: 'gross',
        noticeDivisor: 'calendar_month',
        gratuityEnabled: true,
        gratuityMinYears: 4.80,
        gratuityDivisor: 26,
        gratuityMultiplierDays: 15
      };
    } else {
      settings = settings.toJSON();
    }

    console.log('\n--- SETTINGS IN PLAY ---');
    console.log(settings);

    const p = u.profile || {};
    const joiningDate = p.dateOfJoining || p.date_of_joining || null;
    const finalWorkingDate = new Date().toISOString().split("T")[0]; // today

    console.log('\n--- DATES ---');
    console.log('joiningDate:', joiningDate);
    console.log('finalWorkingDate:', finalWorkingDate);

    // Get salary details
    let sv = {};
    try {
      sv = u.salaryValues
        ? (typeof u.salaryValues === "string" ? JSON.parse(u.salaryValues) : u.salaryValues)
        : {};
    } catch (_) { sv = {}; }
    const svE = (sv && typeof sv === "object" && sv.earnings && typeof sv.earnings === "object") ? sv.earnings : {};

    const svGross = Object.values(svE).reduce((sum, v) => sum + Number(v || 0), 0);
    const basic = Number(u.basicSalary || 0) || Number(svE.basic_salary || svE.BASIC_SALARY || 0);
    const da = Number(u.da || 0) || Number(svE.da || svE.DA || 0);
    const basicDa = basic + da;
    const gross = Number(u.grossSalary || 0) || Number(svE.gross_salary || svE.GROSS_SALARY || 0) || svGross || basicDa;

    console.log('\n--- SALARY ---');
    console.log('basicSalary field:', u.basicSalary);
    console.log('grossSalary field:', u.grossSalary);
    console.log('salaryValues:', u.salaryValues);
    console.log('basic:', basic, 'da:', da, 'basicDa:', basicDa, 'gross:', gross);

    // 2. Leave encashment
    const balances = await LeaveBalance.findAll({ where: { userId } });
    console.log('\n--- LEAVE BALANCES FOR USER ---');
    console.log(balances.map(b => b.toJSON()));

    let totalEligibleLeaves = 0;
    const leavesBreakdown = balances.map(b => {
      const category = String(b.categoryKey).toLowerCase();
      const el = category === "el" || category === "earned leave" || category === "earned_leave" || category === "earned";
      const rem = Number(b.remaining || 0);
      if (el && rem > 0) {
        totalEligibleLeaves += rem;
      }
      return {
        categoryKey: b.categoryKey,
        remaining: rem,
        eligible: el
      };
    });

    if (settings.leaveMaxDays !== null && settings.leaveMaxDays !== undefined && settings.leaveMaxDays > 0) {
      if (totalEligibleLeaves > Number(settings.leaveMaxDays)) {
        totalEligibleLeaves = Number(settings.leaveMaxDays);
      }
    }

    const leaveBasisSalary = settings.leaveBasis === "gross" ? gross : (settings.leaveBasis === "basic" ? basic : basicDa);
    let leaveDivisorVal = 30;
    if (settings.leaveDivisor === "calendar_month") {
      if (finalWorkingDate) {
        const [y, m] = finalWorkingDate.split("-").map(Number);
        leaveDivisorVal = new Date(y, m, 0).getDate();
      } else {
        leaveDivisorVal = 30;
      }
    } else {
      leaveDivisorVal = Number(settings.leaveDivisor) || 30;
    }
    let leaveEncashmentAmount = Math.round((leaveBasisSalary / leaveDivisorVal) * totalEligibleLeaves * 100) / 100;

    console.log('\n--- LEAVE ENCASHMENT COMPUTATION ---');
    console.log('totalEligibleLeaves:', totalEligibleLeaves);
    console.log('leaveBasisSalary:', leaveBasisSalary);
    console.log('leaveDivisorVal:', leaveDivisorVal);
    console.log('leaveEncashmentAmount:', leaveEncashmentAmount);

    // 3. Gratuity estimation
    let gratuityAmount = 0;
    let tenureYears = 0;
    if (joiningDate && finalWorkingDate) {
      const diffTime = Math.abs(new Date(finalWorkingDate) - new Date(joiningDate));
      tenureYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
      console.log('\n--- GRATUITY DETAILS ---');
      console.log('tenureYears calculated:', tenureYears);
      console.log('settings.gratuityEnabled:', settings.gratuityEnabled);
      console.log('settings.gratuityMinYears:', settings.gratuityMinYears);
      if (settings.gratuityEnabled && tenureYears >= Number(settings.gratuityMinYears)) {
        const basis = basicDa;
        gratuityAmount = Math.round((basis / Number(settings.gratuityDivisor || 26)) * Number(settings.gratuityMultiplierDays || 15) * tenureYears * 100) / 100;
      }
      console.log('gratuityAmount:', gratuityAmount);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await sequelize.close();
  }
}

run();
