const express = require('express');
const router = express.Router();
const { OrgAccount, Subscription, Plan } = require('../models');
const { authRequired } = require('../middleware/auth');

// Middleware to ensure user is a channel partner
const channelPartnerOnly = (req, res, next) => {
  if (req.user.role !== 'channel_partner' && !req.user.channelPartnerId) {
    return res.status(403).json({ success: false, message: 'Forbidden: Channel Partner Access Restricted.' });
  }
  next();
};

// GET /channel-partner/clients
router.get('/clients', authRequired, channelPartnerOnly, async (req, res) => {
  console.log('Channel Partner Clients Request:', req.user);
  try {
    const { channelPartnerId } = req.user;
    
    if (!channelPartnerId) {
      return res.status(400).json({ success: false, message: 'Channel Partner ID missing in token' });
    }

    const clients = await OrgAccount.findAll({
      where: { channelPartnerId },
      include: [
        {
          model: Subscription,
          as: 'subscriptions',
          include: [{ model: Plan, as: 'plan' }]
        }
      ],
      order: [['id', 'DESC']]
    });

    // Format like superadmin client list
    const formattedClients = clients.map(client => {
      const activeSub = client.subscriptions?.find(s => s.status === 'ACTIVE') || 
                       client.subscriptions?.sort((a,b) => new Date(b.endAt) - new Date(a.endAt))[0];
      
      return {
        id: client.id,
        name: client.name,
        phone: client.phone,
        status: client.status,
        state: client.state,
        city: client.city,
        staffLimit: activeSub ? (activeSub.staffLimit || activeSub.plan?.staffLimit || '0') : '0',
        planName: activeSub ? activeSub.plan?.name : 'No Plan',
        expiryDate: activeSub ? activeSub.endAt : null
      };
    });

    res.json({ success: true, clients: formattedClients });
  } catch (error) {
    console.error('Error fetching partner clients:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /channel-partner/client/:id/staff-count
router.get('/client/:id/staff-count', authRequired, channelPartnerOnly, async (req, res) => {
  try {
    const org = await OrgAccount.findByPk(req.params.id);
    if (!org || org.channelPartnerId !== req.user.channelPartnerId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const count = await User.count({ where: { orgAccountId: org.id, role: 'staff', active: true } });
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /channel-partner/client/:id/geo-staff-count
router.get('/client/:id/geo-staff-count', authRequired, channelPartnerOnly, async (req, res) => {
  try {
    const org = await OrgAccount.findByPk(req.params.id);
    if (!org || org.channelPartnerId !== req.user.channelPartnerId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const { sequelize } = require('../sequelize');
    const [results] = await sequelize.query(`
      SELECT COUNT(DISTINCT u.id) as count
      FROM users u
      WHERE u.org_account_id = :clientId
      AND u.role = 'staff'
      AND u.active = 1
      AND EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        JOIN role_permissions rp ON r.id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = u.id
        AND p.name = 'geolocation_access'
      )
    `, {
      replacements: { clientId: org.id },
      type: sequelize.QueryTypes.SELECT
    });
    res.json({ success: true, count: results ? results.count : 0 });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /channel-partner/clients/:id/plan-details
router.get('/clients/:id/plan-details', authRequired, channelPartnerOnly, async (req, res) => {
  try {
    const org = await OrgAccount.findByPk(req.params.id);
    console.log('Plan Details Debug - Org:', org ? { id: org.id, partnerId: org.channelPartnerId } : 'NULL');
    console.log('Plan Details Debug - User PartnerId:', req.user.channelPartnerId);

    if (!org || org.channelPartnerId !== req.user.channelPartnerId) {
      console.log('Plan Details Debug - FORBIDDEN check failed');
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const sub = await Subscription.findOne({
      where: { orgAccountId: org.id, status: 'ACTIVE' },
      order: [['endAt', 'DESC']],
      include: [{ model: Plan, as: 'plan' }]
    });
    if (!sub) return res.json({ success: true, planDetails: { planName: 'No Plan', status: 'none' } });

    res.json({
      success: true,
      planDetails: {
        planName: sub.plan?.name || 'Custom',
        startDate: sub.startAt,
        endDate: sub.endAt,
        status: new Date(sub.endAt) < new Date() ? 'expired' : 'active',
        features: sub.plan?.features || []
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
