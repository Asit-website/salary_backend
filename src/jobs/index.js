const cron = require('node-cron');
const { checkSubscriptionExpiryReminders } = require('./subscriptionExpiryReminder');
const { scheduleZktecoSync, runZktecoSyncAllOrgs } = require('./zktecoSync');
const { checkMissingAttendanceAndNotify } = require('./attendanceReminder');
const { checkMissingCheckoutAndNotify } = require('./missingCheckoutReminder');
const { checkAbsentStaffAndNotify } = require('./absentStaffReminder');
const { processMailQueue } = require('./mailCampaignJob');
const { scheduleShiftRotationCron, runShiftRotationCronManual } = require('./rotationCron');
const { syncAllAppraisalCycles } = require('./pmsCycleJob');

// Schedule PMS appraisal cycles status automation check (runs hourly and at midnight)
const schedulePmsCycleJob = () => {
  cron.schedule('5 0 * * *', async () => {
    console.log('⏰ Running scheduled PMS Appraisal Cycle status automation check...');
    await syncAllAppraisalCycles();
  });
  console.log('📅 PMS Appraisal Cycle automation job scheduled to run daily at 00:05 AM');
};

// Schedule the subscription expiry reminder job to run daily at 9:00 AM
const scheduleSubscriptionExpiryReminders = () => {
  // Run every day at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('⏰ Running scheduled subscription expiry reminder check...');
    await checkSubscriptionExpiryReminders();
  });

  console.log('📅 Subscription expiry reminder job scheduled to run daily at 9:00 AM');
};

// Schedule missing attendance reminder at 5:00 PM daily (checks attendance of 2 days ago, e.g. 13th missing is sent on 15th)
const scheduleAttendanceReminders = () => {
  cron.schedule('0 17 * * *', async () => {
    console.log('⏰ Running scheduled missing attendance reminder at 5:00 PM...');
    await checkMissingAttendanceAndNotify();
  }, {
    timezone: 'Asia/Kolkata'
  });
  console.log('📅 Missing attendance reminder job scheduled to run daily at 5:00 PM (IST)');
};

// Schedule social celebrations (Birthdays/Anniversaries) at 8:00 AM daily
const scheduleSocialCelebrations = () => {
  cron.schedule('0 8 * * *', async () => {
    console.log('⏰ Running scheduled social celebrations check...');
    await checkAndPostCelebrations();
  });
  console.log('📅 Social celebrations job scheduled to run daily at 8:00 AM');
};

// Schedule missing checkout and absent staff emails at 5:00 PM daily
const scheduleMissingCheckoutReminders = () => {
  cron.schedule('0 17 * * *', async () => {
    console.log('⏰ Running scheduled missing check-out reminder...');
    await checkMissingCheckoutAndNotify();
    
    console.log('⏰ Running scheduled absent staff reminder...');
    await checkAbsentStaffAndNotify();
  });
  console.log('📅 Missing checkout and Absent staff email jobs scheduled to run daily at 5:00 PM');
};

// Schedule bulk mail processing to run every minute
const scheduleBulkMailJob = () => {
  cron.schedule('* * * * *', async () => {
    // console.log('⏰ Running scheduled bulk mail processing...');
    await processMailQueue();
  });
  console.log('📅 Bulk mail processing job scheduled to run every 1 minute');
};

// Also provide a manual trigger function for testing
const runSubscriptionExpiryCheck = async () => {
  console.log('🔧 Manually triggering subscription expiry reminder check...');
  await checkSubscriptionExpiryReminders();
};

const runAttendanceReminderManual = async () => {
  console.log('🔧 Manually triggering missing attendance reminder...');
  await checkMissingAttendanceAndNotify();
};

const runSocialCelebrationsManual = async () => {
  console.log('🔧 Manually triggering social celebrations check...');
  await checkAndPostCelebrations();
};

module.exports = {
  scheduleSubscriptionExpiryReminders,
  runSubscriptionExpiryCheck,
  scheduleZktecoSync,
  runZktecoSyncAllOrgs,
  scheduleAttendanceReminders,
  runAttendanceReminderManual,
  scheduleBulkMailJob,
  scheduleSocialCelebrations,
  runSocialCelebrationsManual,
  scheduleMissingCheckoutReminders,
  scheduleShiftRotationCron,
  runShiftRotationCronManual,
  schedulePmsCycleJob,
  syncAllAppraisalCycles
};
