const { PayrollLine, PayrollCycle } = require('./src/models');

async function check() {
  try {
    const cycle = await PayrollCycle.findOne({ where: { monthKey: '2026-02' } });
    if (!cycle) {
      console.log('No cycle found for 2026-02');
      return;
    }
    const line = await PayrollLine.findOne({ 
      where: { userId: 63, cycleId: cycle.id } 
    });
    if (!line) {
      console.log('No line found for user 63 in Feb 2026');
      return;
    }
    console.log('ID:', line.id);
    console.log('isManual:', line.isManual);
    console.log('Totals:', JSON.stringify(line.totals, null, 2));
    console.log('Earnings:', JSON.stringify(line.earnings, null, 2));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

check();
