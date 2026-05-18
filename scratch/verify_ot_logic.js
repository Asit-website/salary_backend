
const testBuildMeta = (rows) => {
  const meta = new Map();
  const daysInMonth = 30;

  for (const row of rows) {
    const userId = row.userId;
    const current = meta.get(userId) || { otDays: 0, otMinutes: 0, otPay: 0, fooding: 0 };
    
    // Mock calculateOvertime result
    const otRes = {
      overtimeMinutes: row.minutes,
      overtimeAmount: row.amount,
      extraFullDayBonusAmount: row.bonus || 0,
      fullDayOvertimeApplied: row.isFullDay
    };

    const amount = Number(otRes.overtimeAmount || 0);
    const fooding = Number(otRes.extraFullDayBonusAmount || 0);

    // NEW LOGIC
    if (otRes.fullDayOvertimeApplied) {
      current.otDays += 1;
    } else {
      current.otMinutes += Number(otRes.overtimeMinutes || 0);
    }
    
    current.otPay += Math.max(0, amount - fooding);
    current.fooding += fooding;
    meta.set(userId, current);
  }
  return meta;
};

const rows = [
  { userId: 1, minutes: 300, amount: 500, bonus: 25, isFullDay: true }, // Full day day 1
  { userId: 1, minutes: 120, amount: 200, bonus: 0, isFullDay: false }, // Normal OT day 2
];

const result = testBuildMeta(rows);
console.log('Test Result for User 1:', result.get(1));

// Expected: 
// otDays: 1
// otMinutes: 120 (300 should be subtracted)
// otPay: (500-25) + 200 = 675
// fooding: 25
