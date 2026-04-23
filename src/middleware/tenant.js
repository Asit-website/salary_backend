const { User, OrgAccount, Subscription, Plan } = require('../models');
const { Op } = require('sequelize');

async function tenantEnforce(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthenticated' });
    if (req.user.role === 'superadmin' || req.user.role === 'channel_partner') {
      // Superadmin can specify org via header, query, or fallback to their own orgAccountId
      const headerOrg = req.headers['x-org-id'] || req.query.orgId || null;
      const user = await User.findByPk(req.user.id);
      const fallbackOrg = user?.orgAccountId || null;
      req.tenantClientId = null;

      let finalOrg = fallbackOrg;
      if (headerOrg) {
        const n = Number(headerOrg);
        if (!isNaN(n)) finalOrg = n;
      }
      req.tenantOrgAccountId = finalOrg;
      return next();
    }

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthenticated' });

    const orgAccountId = user.orgAccountId || null;
    req.tenantOrgAccountId = orgAccountId;
    req.tenantClientId = null;
    if (!orgAccountId) return res.status(403).json({ success: false, message: 'No organization assigned' });

    const org = await OrgAccount.findByPk(orgAccountId);
    if (!org) return res.status(403).json({ success: false, message: 'Organization missing' });
    if (org.status !== 'ACTIVE') return res.status(403).json({ success: false, message: 'Organization disabled' });

    // Find all active subscriptions
    const now = new Date();
    const allActiveSubs = await Subscription.findAll({
      where: { orgAccountId, status: 'ACTIVE' },
      order: [['endAt', 'ASC']], // Order by earliest ending first
      include: [{ model: Plan, as: 'plan' }],
    });

    // 1. Try to find a strictly valid one (Current)
    // We pick the one that ends EARLIEST among those that are currently valid.
    // This ensures that "Upgrade" (which ends later) doesn't override the "Current" plan early.
    let sub = allActiveSubs.find(s => {
      const start = new Date(s.startAt);
      const end = new Date(s.endAt);
      return start <= now && end >= now;
    });

    // 2. Fallback: If no strictly valid one, but we have future plans
    if (!sub) {
      // Find the one that starts soonest
      const futureSub = allActiveSubs.find(s => new Date(s.startAt) > now);
      if (futureSub) {
        const startAt = new Date(futureSub.startAt);
        // If it starts within 24 hours, allow it early to bridge gaps
        if ((startAt.getTime() - now.getTime()) <= 24 * 60 * 60 * 1000) {
          sub = futureSub;
        } else {
          return res.status(402).json({ 
            success: false, 
            message: 'Your new plan has not started yet. Starts at: ' + startAt.toLocaleString() 
          });
        }
      }
    }

    // 3. Fallback: If still no sub, check for recently expired ones to show a good message
    if (!sub) {
      return res.status(402).json({ success: false, message: 'your Plan Expired pls renew' });
    }

    // Final safety check for expired (shouldn't hit if found in step 1, but good for step 2/3)
    if (new Date(sub.endAt) < now) {
       return res.status(402).json({ success: false, message: 'your Plan Expired pls renew' });
    }

    req.activeSubscription = sub;
    // Attach limits and features from subscription (which may override plan defaults)
    req.subscriptionInfo = {
      staffLimit: sub.staffLimit || sub.plan?.staffLimit || 0,
      maxGeolocationStaff: sub.maxGeolocationStaff !== null ? sub.maxGeolocationStaff : (sub.plan?.maxGeolocationStaff || 0),
      salesEnabled: sub.salesEnabled !== null && sub.salesEnabled !== undefined ? (!!sub.salesEnabled || !!sub.plan?.salesEnabled) : !!sub.plan?.salesEnabled,
      geolocationEnabled: sub.geolocationEnabled !== null && sub.geolocationEnabled !== undefined ? (!!sub.geolocationEnabled || !!sub.plan?.geolocationEnabled) : !!sub.plan?.geolocationEnabled,
      expenseEnabled: sub.expenseEnabled !== null && sub.expenseEnabled !== undefined ? (!!sub.expenseEnabled || !!sub.plan?.expenseEnabled) : !!sub.plan?.expenseEnabled
    };
    return next();
  } catch (e) {
    console.error('Tenant check failed:', e);
    return res.status(500).json({ success: false, message: 'Tenant check failed: ' + e.message });
  }
}

module.exports = { tenantEnforce };
