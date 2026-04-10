const cron = require('node-cron');
const { checkSubscriptionExpiryReminders } = require('./subscriptionExpiryReminder');
const { scheduleZktecoSync, runZktecoSyncAllOrgs } = require('./zktecoSync');
const { checkMissingAttendanceAndNotify } = require('./attendanceReminder');
const { processMailQueue } = require('./mailCampaignJob');
const { checkAndPostCelebrations } = require('./socialJob');

// Schedule the subscription expiry reminder job to run daily at 9:00 AM
const scheduleSubscriptionExpiryReminders = () => {
  // Run every day at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('⏰ Running scheduled subscription expiry reminder check...');
    await checkSubscriptionExpiryReminders();
  });

  console.log('📅 Subscription expiry reminder job scheduled to run daily at 9:00 AM');
};

// Schedule missing attendance reminder at 9:30 AM daily
const scheduleAttendanceReminders = () => {
  cron.schedule('30 9 * * *', async () => {
    console.log('⏰ Running scheduled missing attendance reminder...');
    await checkMissingAttendanceAndNotify();
  });
  console.log('📅 Missing attendance reminder job scheduled to run daily at 9:30 AM');
};

// Schedule social celebrations (Birthdays/Anniversaries) at 8:00 AM daily
const scheduleSocialCelebrations = () => {
  cron.schedule('0 8 * * *', async () => {
    console.log('⏰ Running scheduled social celebrations check...');
    await checkAndPostCelebrations();
  });
  console.log('📅 Social celebrations job scheduled to run daily at 8:00 AM');
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
  runSocialCelebrationsManual
};
