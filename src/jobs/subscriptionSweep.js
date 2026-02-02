const { Op } = require('sequelize');
const { OrgAccount, Subscription } = require('../models');

async function runSweepOnce(now = new Date()) {
  // Mark expired subscriptions and disable their orgs
  const expiredSubs = await Subscription.findAll({
    where: {
      status: 'ACTIVE',
      endAt: { [Op.lt]: now },
    },
  });

  for (const sub of expiredSubs) {
    try {
      await sub.update({ status: 'EXPIRED' });
      const org = await OrgAccount.findByPk(sub.orgAccountId);
      if (org && org.status !== 'DISABLED') {
        await org.update({ status: 'DISABLED' });
      }
    } catch (_) {
      // continue others
    }
  }
}

function scheduleSubscriptionSweep() {
  // Run immediately on startup
  runSweepOnce().catch(() => {});

  // Then run every 6 hours
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  setInterval(() => {
    runSweepOnce().catch(() => {});
  }, SIX_HOURS);
}

module.exports = { scheduleSubscriptionSweep, runSweepOnce };
