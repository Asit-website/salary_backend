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

    // SHARED SUBSCRIPTION LOGIC: 
    // All organizations for the same phone number share the Parent (Oldest) organization's plan.
    const normalizedPhone = user.phone;
    const firstAdmin = await User.findOne({ 
      where: { phone: String(normalizedPhone), role: 'admin' }, 
      order: [['id', 'ASC']] 
    });

    const effectiveOrgId = (firstAdmin && firstAdmin.orgAccountId) ? firstAdmin.orgAccountId : orgAccountId;

    // Find all active subscriptions for the EFFECTIVE organization (Parent)
    const now = new Date();
    const allActiveSubs = await Subscription.findAll({
      where: { orgAccountId: effectiveOrgId, status: 'ACTIVE' },
      order: [['endAt', 'ASC']], 
      include: [{ model: Plan, as: 'plan' }],
    });

    let sub = allActiveSubs.find(s => {
      const end = new Date(s.endAt);
      return end >= now;
    });

    if (!sub) {
      const futureSub = allActiveSubs.find(s => new Date(s.startAt) > now);
      if (futureSub) {
        const startAt = new Date(futureSub.startAt);
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

    if (!sub) {
      return res.status(402).json({ success: false, message: 'your Plan Expired pls renew' });
    }

    if (new Date(sub.endAt) < now) {
       return res.status(402).json({ success: false, message: 'your Plan Expired pls renew' });
    }

    // SHARED STAFF COUNT: Count unique active staff phone numbers across ALL organizations for this phone number
    const totalStaffCount = await User.count({
      distinct: true,
      col: 'phone',
      where: {
        phone: { [Op.ne]: normalizedPhone }, // Don't count the admin themselves
        role: 'staff',
        active: true,
        // Find all users with any of the orgAccountId's that belong to this phone
        orgAccountId: {
          [Op.in]: (await User.findAll({ 
            where: { phone: String(normalizedPhone), role: 'admin' },
            attributes: ['orgAccountId']
          })).map(u => u.orgAccountId).filter(id => id !== null)
        }
      }
    });

    req.activeSubscription = sub;
    req.subscriptionInfo = {
      staffLimit: sub.staffLimit || sub.plan?.staffLimit || 0,
      currentTotalStaff: totalStaffCount,
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
