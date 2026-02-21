const { User, OrgAccount, Subscription, Plan } = require('../models');

async function tenantEnforce(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthenticated' });
    if (req.user.role === 'superadmin') {
      // Superadmin can specify org via header, query, or fallback to their own orgAccountId
      const headerOrg = req.headers['x-org-id'] || req.query.orgId || null;
      const user = await User.findByPk(req.user.id);
      const fallbackOrg = user?.orgAccountId || null;
      req.tenantClientId = null;
      req.tenantOrgAccountId = headerOrg ? Number(headerOrg) : fallbackOrg;
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

    // Check active subscription
    const now = new Date();
    const sub = await Subscription.findOne({
      where: { orgAccountId, status: 'ACTIVE' },
      order: [['endAt', 'DESC'], ['updatedAt', 'DESC']],
      include: [{ model: Plan, as: 'plan' }],
    });
    if (!sub || new Date(sub.endAt) < now) {
      return res.status(402).json({ success: false, message: 'Subscription expired' });
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
    return res.status(500).json({ success: false, message: 'Tenant check failed' });
  }
}

module.exports = { tenantEnforce };
