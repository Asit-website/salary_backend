const { sendSubscriptionExpiryReminderEmail } = require('../services/emailService');
const { Op } = require('sequelize');

// Check and send subscription expiry reminders
const checkSubscriptionExpiryReminders = async () => {
  try {
    console.log('🔍 Checking for subscriptions expiring in 2 days...');
    
    const { OrgAccount, Subscription, Plan, User } = require('../models');
    
    // Calculate date 2 days from now
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    const twoDaysFromNowStr = twoDaysFromNow.toISOString().split('T')[0];
    
    console.log(`📅 Looking for subscriptions expiring on: ${twoDaysFromNowStr}`);
    
    // Find active subscriptions expiring in 2 days
    const expiringSubscriptions = await Subscription.findAll({
      where: {
        endAt: {
          [Op.gte]: new Date(twoDaysFromNowStr + ' 00:00:00'),
          [Op.lte]: new Date(twoDaysFromNowStr + ' 23:59:59')
        },
        status: 'ACTIVE'
      },
      include: [
        {
          model: OrgAccount,
          as: 'orgAccount',
          include: [
            {
              model: User,
              as: 'users',
              where: { role: 'admin' },
              required: false
            }
          ]
        },
        {
          model: Plan,
          as: 'plan'
        }
      ]
    });
    
    console.log(`📊 Found ${expiringSubscriptions.length} subscriptions expiring in 2 days`);
    
    for (const subscription of expiringSubscriptions) {
      const org = subscription.orgAccount;
      const plan = subscription.plan;
      
      if (!org || !org.businessEmail) {
        console.log(`⚠️ Skipping subscription ${subscription.id} - no business email found`);
        continue;
      }
      
      // Find admin user for name
      const adminUser = org.users && org.users.find(user => user.role === 'admin');
      const adminName = adminUser ? (adminUser.name || org.name) : org.name;
      
      const subscriptionDetails = {
        planType: plan ? plan.name : 'Basic',
        expiryDate: new Date(subscription.endAt).toLocaleDateString(),
        userLimit: subscription.staffLimit || 'N/A',
        renewalLink: 'http://localhost:3000/renew', // Update with actual renewal URL
        productName: 'Vetansutra'
      };
      
      console.log(`📧 Sending reminder to ${org.businessEmail} for ${org.name}`);
      
      const result = await sendSubscriptionExpiryReminderEmail(
        org.businessEmail,
        adminName,
        org.name,
        subscriptionDetails
      );
      
      if (result.success) {
        console.log(`✅ Reminder sent successfully to ${org.businessEmail}`);
      } else {
        console.error(`❌ Failed to send reminder to ${org.businessEmail}:`, result.error);
      }
    }
    
    console.log('✅ Subscription expiry reminder check completed');
    
  } catch (error) {
    console.error('❌ Error checking subscription expiry reminders:', error);
  }
};

module.exports = {
  checkSubscriptionExpiryReminders
};
