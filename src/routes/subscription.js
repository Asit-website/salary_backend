const express = require('express');
const { Plan, Subscription, User, OrgAccount } = require('../models');
const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { tenantEnforce } = require('../middleware/tenant');

const router = express.Router();

// Get all subscription plans (superadmin only)
router.get('/plans', authRequired, requireRole('superadmin'), async (req, res) => {
  try {
    const plans = await Plan.findAll({
      where: { active: true },
      order: [['price', 'ASC']]
    });

    res.json({ success: true, plans });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Create new subscription plan (superadmin only)
router.post('/plans', authRequired, requireRole('superadmin'), async (req, res) => {
  try {
    const {
      code,
      name,
      description,
      periodDays,
      staffLimit,
      price,
      salesEnabled,
      geolocationEnabled,
      maxGeolocationStaff,
      features
    } = req.body;

    const plan = await Plan.create({
      code,
      name,
      description,
      periodDays,
      staffLimit,
      price,
      salesEnabled,
      geolocationEnabled,
      maxGeolocationStaff,
      features,
      active: true
    });

    res.status(201).json({ success: true, plan });
  } catch (error) {
    console.error('Create plan error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Update subscription plan (superadmin only)
router.put('/plans/:id', authRequired, requireRole('superadmin'), async (req, res) => {
  try {
    const plan = await Plan.findByPk(req.params.id);

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    const {
      name,
      description,
      periodDays,
      staffLimit,
      price,
      salesEnabled,
      geolocationEnabled,
      maxGeolocationStaff,
      features,
      active
    } = req.body;

    await plan.update({
      name,
      description,
      periodDays,
      staffLimit,
      price,
      salesEnabled,
      geolocationEnabled,
      maxGeolocationStaff,
      features,
      active
    });

    res.json({ success: true, plan });
  } catch (error) {
    console.error('Update plan error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Assign subscription to organization (superadmin only)
router.post('/assign-subscription', authRequired, requireRole('superadmin'), async (req, res) => {
  try {
    const { orgAccountId, planId, startAt, endAt } = req.body;

    const orgAccount = await OrgAccount.findByPk(orgAccountId);
    if (!orgAccount) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    const plan = await Plan.findByPk(planId);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    // Create or update subscription
    const subscription = await Subscription.create({
      orgAccountId,
      planId,
      startAt: startAt || new Date(),
      endAt: endAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      status: 'ACTIVE',
      staffLimit: plan.staffLimit
    });

    // Get updated subscription with plan
    const updatedSubscription = await Subscription.findByPk(subscription.id, {
      include: [{ model: Plan, as: 'plan' }]
    });

    res.json({ success: true, subscription: updatedSubscription });
  } catch (error) {
    console.error('Assign subscription error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get all organizations with their subscriptions (superadmin only)
router.get('/clients', authRequired, requireRole('superadmin'), async (req, res) => {
  try {
    const subscriptions = await Subscription.findAll({
      include: [
        { model: Plan, as: 'plan' },
        { model: OrgAccount, as: 'orgAccount' }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Get staff count for each organization
    const subscriptionsWithStaffCount = await Promise.all(
      subscriptions.map(async (subscription) => {
        const staffCount = await User.count({
          where: {
            orgAccountId: subscription.orgAccountId,
            role: 'staff',
            active: true
          }
        });

        return {
          ...subscription.toJSON(),
          staffCount,
          staffLimit: subscription.plan?.staffLimit || 0,
          isStaffLimitReached: staffCount >= (subscription.plan?.staffLimit || 0)
        };
      })
    );

    res.json({ success: true, clients: subscriptionsWithStaffCount });
  } catch (error) {
    console.error('Get organizations error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Update subscription geolocation staff limit (superadmin only)
router.put('/clients/:subscriptionId/geolocation-limit', authRequired, requireRole('superadmin'), async (req, res) => {
  try {
    const { maxGeolocationStaff } = req.body;
    const { subscriptionId } = req.params;

    const subscription = await Subscription.findByPk(subscriptionId);
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    // Update subscription's geolocation staff limit in meta
    const meta = subscription.meta || {};
    meta.maxGeolocationStaff = maxGeolocationStaff;

    await subscription.update({ meta });

    res.json({ success: true, maxGeolocationStaff });
  } catch (error) {
    console.error('Update geolocation limit error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get organization subscription info (for admin panel)
router.get('/subscription-info', authRequired, tenantEnforce, async (req, res) => {
  try {
    const orgAccountId = req.tenantOrgAccountId;

    if (!orgAccountId) {
      return res.status(403).json({ success: false, message: 'Organization context required' });
    }

    const subscription = await Subscription.findOne({
      where: { orgAccountId, status: 'ACTIVE' },
      order: [['endAt', 'DESC'], ['updatedAt', 'DESC']],
      include: [{
        model: Plan,
        as: 'plan'
      }]
    });

    if (!subscription || !subscription.plan) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    // Get current staff count
    const currentStaffCount = await User.count({
      where: {
        orgAccountId,
        role: 'staff',
        active: true
      }
    });

    const subscriptionInfo = {
      plan: subscription.plan,
      currentStaffCount,
      staffLimit: subscription.staffLimit || subscription.plan.staffLimit,
      canAddStaff: currentStaffCount < (subscription.staffLimit || subscription.plan.staffLimit),
      salesEnabled: !!subscription.salesEnabled,
      geolocationEnabled: !!subscription.geolocationEnabled,
      maxGeolocationStaff: subscription.maxGeolocationStaff !== null ? subscription.maxGeolocationStaff : (subscription.meta?.maxGeolocationStaff || subscription.plan.maxGeolocationStaff),
      subscriptionStatus: subscription.status
    };

    res.json({ success: true, subscriptionInfo });
  } catch (error) {
    console.error('Get subscription info error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
