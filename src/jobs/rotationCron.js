const cron = require('node-cron');
const dayjs = require('dayjs');
const { OrgAccount } = require('../models');
const { generateRotatedRoster } = require('../services/rotationService');

/**
 * Automates monthly shift rotation generation on the 25th of each month.
 * It will generate the roster for the entire upcoming month (from 1st to end of next month).
 */
const scheduleShiftRotationCron = () => {
  // Run on the 25th of every month at 1:00 AM
  cron.schedule('0 1 25 * *', async () => {
    console.log('⏰ [Cron] Running monthly shift rotation generator...');
    try {
      const nextMonthStart = dayjs().add(1, 'month').startOf('month');
      const nextMonthEnd = dayjs().add(1, 'month').endOf('month');

      const startDateStr = nextMonthStart.format('YYYY-MM-DD');
      const endDateStr = nextMonthEnd.format('YYYY-MM-DD');

      console.log(`[Cron] Target range for upcoming month: ${startDateStr} to ${endDateStr}`);

      // Fetch all active organizations
      const activeOrgs = await OrgAccount.findAll({
        where: { status: 'ACTIVE' },
        attributes: ['id', 'name']
      });

      console.log(`[Cron] Found ${activeOrgs.length} active organizations to process.`);

      for (const org of activeOrgs) {
        try {
          console.log(`[Cron] Generating shift rotation for Org ID: ${org.id} (${org.name})`);
          const result = await generateRotatedRoster(org.id, startDateStr, endDateStr);
          console.log(`[Cron] Success for Org ID: ${org.id}. Generated ${result.count} roster entries.`);
        } catch (orgError) {
          console.error(`[Cron] Error generating rotation for Org ID: ${org.id}:`, orgError.message);
        }
      }

      console.log('⏰ [Cron] Monthly shift rotation generator run complete.');
    } catch (err) {
      console.error('⏰ [Cron] Global error in monthly shift rotation generator cron:', err);
    }
  });

  console.log('📅 Shift rotation monthly cron scheduled to run on the 25th at 1:00 AM');
};

/**
 * Manual trigger helper for testing / debugging
 */
const runShiftRotationCronManual = async () => {
  console.log('🔧 [Manual] Triggering shift rotation cron job manually...');
  const nextMonthStart = dayjs().add(1, 'month').startOf('month');
  const nextMonthEnd = dayjs().add(1, 'month').endOf('month');

  const startDateStr = nextMonthStart.format('YYYY-MM-DD');
  const endDateStr = nextMonthEnd.format('YYYY-MM-DD');

  const activeOrgs = await OrgAccount.findAll({
    where: { status: 'ACTIVE' },
    attributes: ['id', 'name']
  });

  for (const org of activeOrgs) {
    try {
      const result = await generateRotatedRoster(org.id, startDateStr, endDateStr);
      console.log(`[Manual] Org ${org.name}: generated ${result.count} entries`);
    } catch (e) {
      console.error(`[Manual] Org ${org.name} failed:`, e.message);
    }
  }
};

module.exports = {
  scheduleShiftRotationCron,
  runShiftRotationCronManual
};
