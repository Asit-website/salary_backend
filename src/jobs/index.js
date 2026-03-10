const cron = require('node-cron');
const { checkSubscriptionExpiryReminders } = require('./subscriptionExpiryReminder');
const { scheduleZktecoSync, runZktecoSyncAllOrgs } = require('./zktecoSync');

// Schedule the subscription expiry reminder job to run daily at 9:00 AM
const scheduleSubscriptionExpiryReminders = () => {
  // Run every day at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('⏰ Running scheduled subscription expiry reminder check...');
    await checkSubscriptionExpiryReminders();
  });

  console.log('📅 Subscription expiry reminder job scheduled to run daily at 9:00 AM');
};

// Also provide a manual trigger function for testing
const runSubscriptionExpiryCheck = async () => {
  console.log('🔧 Manually triggering subscription expiry reminder check...');
  await checkSubscriptionExpiryReminders();
};

module.exports = {
  scheduleSubscriptionExpiryReminders,
  runSubscriptionExpiryCheck,
  scheduleZktecoSync,
  runZktecoSyncAllOrgs
};
