const { User, OrgAccount, Subscription, Plan } = require('../models');
const { Op } = require('sequelize');

async function tenantEnforce(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthenticated' });

    let perms = req.user.permissions;
    if (typeof perms === 'string') {
      try { perms = JSON.parse(perms); } catch (_) {}
    }
    const hasSuperAccess = req.user.role === 'superadmin' || (perms && perms.superadmin_access === true);

    if (hasSuperAccess || req.user.role === 'channel_partner') {
      // Superadmin / Superadmin Staff / Channel partner can specify org via header, query, or fallback to their own orgAccountId
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
    // Organizations share the Parent (Primary) organization's plan based on the OrgAccount's phone number.
    const ownerPhone = org.phone;
    if (!ownerPhone) return res.status(403).json({ success: false, message: 'Organization has no owner identity' });

    // Find the oldest organization for this owner phone (the Parent)
    const primaryOrg = await OrgAccount.findOne({
      where: { phone: ownerPhone },
      order: [['id', 'ASC']]
    });

    const effectiveOrgId = primaryOrg ? primaryOrg.id : orgAccountId;

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

    // SHARED STAFF COUNT: Count unique staff phone numbers across ALL organizations linked to this owner phone
    // We find all org IDs linked to this owner phone first
    const linkedOrgs = await OrgAccount.findAll({
      where: { phone: ownerPhone },
      attributes: ['id']
    });
    const linkedOrgIds = linkedOrgs.map(o => o.id);

    const totalStaffCount = await User.count({
      distinct: true,
      col: 'phone',
      where: {
        role: 'staff',
        active: true,
        orgAccountId: { [Op.in]: linkedOrgIds },
        // Don't count the owner's phone as staff (unlikely but safe)
        phone: { [Op.ne]: ownerPhone }
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
