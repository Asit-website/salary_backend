const { Op } = require('sequelize');
const { OrgAccount, Subscription, Plan, User } = require('../models');
const { sendSubscriptionExpiredEmail } = require('../services/emailService');

async function runSweepOnce(now = new Date()) {
  // Mark expired subscriptions and disable their orgs
  const expiredSubs = await Subscription.findAll({
    where: {
      status: 'ACTIVE',
      endAt: { [Op.lt]: now },
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

  for (const sub of expiredSubs) {
    try {
      await sub.update({ status: 'EXPIRED' });
      const org = sub.orgAccount;
      if (org && org.status !== 'DISABLED') {
        await org.update({ status: 'DISABLED' });

        // Send expired subscription email
        if (org.businessEmail) {
          const adminUser = org.users && org.users.find(user => user.role === 'admin');
          const adminName = adminUser ? (adminUser.name || org.name) : org.name;

          const subscriptionDetails = {
            expiryDate: new Date(sub.endAt).toLocaleDateString(),
            renewalLink: 'http://localhost:3000/renew', // Update with actual renewal URL
            productName: 'Vetansutra'
          };

          console.log(`📧 Sending expired subscription email to ${org.businessEmail} for ${org.name}`);

          const result = await sendSubscriptionExpiredEmail(
            org.businessEmail,
            adminName,
            org.name,
            subscriptionDetails
          );

          if (result.success) {
            console.log(`✅ Expired subscription email sent successfully to ${org.businessEmail}`);
          } else {
            console.error(`❌ Failed to send expired subscription email to ${org.businessEmail}:`, result.error);
          }
        }
      }
    } catch (_) {
      // continue others
    }
  }
}

function scheduleSubscriptionSweep() {
  // Run immediately on startup
  runSweepOnce().catch(() => { });

  // Then run every 6 hours
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  setInterval(() => {
    runSweepOnce().catch(() => { });
  }, SIX_HOURS);
}

module.exports = { scheduleSubscriptionSweep, runSweepOnce };
