const { User, OrgAccount, Subscription } = require('../models');

async function continuousVerify(req, res, next) {
  try {
    // If request has not been authenticated yet, skip (allow normal routes to handle missing token)
    if (!req.user || !req.user.id) {
      return next();
    }

    const { id, role, orgAccountId } = req.user;

    // 1. Verify User active status directly from DB
    const dbUser = await User.findByPk(id);
    if (!dbUser) {
      return res.status(401).json({ success: false, message: 'User account not found' });
    }

    if (dbUser.active === false) {
      return res.status(403).json({ success: false, message: 'User account has been deactivated' });
    }

    // 2. Verify Organization status if user is tied to an organization
    const activeOrgId = dbUser.orgAccountId || orgAccountId;
    if (activeOrgId) {
      const org = await OrgAccount.findByPk(activeOrgId);
      if (!org) {
        return res.status(403).json({ success: false, message: 'Organization not found' });
      }
      if (org.status !== 'ACTIVE') {
        return res.status(403).json({ success: false, message: 'Organization is disabled' });
      }

      // 3. Verify Subscription plan is not expired (Skip for superadmins and channel partners)
      let perms = dbUser.permissions;
      if (typeof perms === 'string') {
        try { perms = JSON.parse(perms); } catch (_) {}
      }
      const isSuper = dbUser.role === 'superadmin' || role === 'superadmin' || (perms && perms.superadmin_access === true);
      const isPartner = dbUser.role === 'channel_partner' || role === 'channel_partner';

      if (!isSuper && !isPartner) {
        const sub = await Subscription.findOne({
          where: { orgAccountId: org.id, status: 'ACTIVE' },
          order: [['endAt', 'DESC']]
        });

        if (!sub || new Date(sub.endAt) < new Date()) {
          return res.status(402).json({ success: false, message: 'Your plan has expired. Please renew.' });
        }
      }
    }

    // Pass the actual refreshed dbUser details downstream if needed
    req.dbUser = dbUser;

    next();
  } catch (err) {
    console.error('[CONTINUOUS AUTH EXCEPTION]:', err);
    // Graceful fallback: on DB glitches, let it proceed to avoid blocking users unnecessarily
    next();
  }
}

module.exports = { continuousVerify };
