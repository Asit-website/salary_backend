const express = require('express');
const router = express.Router();
const { SalesIncentiveRule, StaffIncentiveRule, User, StaffProfile, StaffSalesIncentive, Order } = require('../models');
const { authRequired } = require('../middleware/auth');
const { tenantEnforce } = require('../middleware/tenant');
const { requireRole } = require('../middleware/roles');


// Helper to get org ID
const getOrgId = (req) => req.tenantOrgAccountId;

router.use(authRequired);
router.use(tenantEnforce);
router.use(requireRole(['admin', 'superadmin']));

// List Rules
router.get('/', async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const rules = await SalesIncentiveRule.findAll({
            where: { orgAccountId: orgId },
            order: [['created_at', 'DESC']]
        });
        return res.json({ success: true, rules });
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Failed to load rules' });
    }
});

// Create Rule
router.post('/', async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const { name, ruleType, config, active } = req.body;
        if (!name || !ruleType || !config) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        const rule = await SalesIncentiveRule.create({
            orgAccountId: orgId,
            name,
            ruleType,
            config,
            active: active !== false
        });
        return res.json({ success: true, rule });
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Failed to create rule' });
    }
});

// Update Rule
router.put('/:id', async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const { name, ruleType, config, active } = req.body;
        const rule = await SalesIncentiveRule.findOne({ where: { id: req.params.id, orgAccountId: orgId } });
        if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });

        await rule.update({ name, ruleType, config, active: active !== false });
        return res.json({ success: true, rule });
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Failed to update rule' });
    }
});

// Delete Rule
router.delete('/:id', async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const rule = await SalesIncentiveRule.findOne({ where: { id: req.params.id, orgAccountId: orgId } });
        if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });

        await rule.destroy();
        return res.json({ success: true, message: 'Rule deleted' });
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Failed to delete rule' });
    }
});

// List Approvals (Achieved Incentives)
router.get('/approvals', async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const approvals = await StaffSalesIncentive.findAll({
            where: { orgAccountId: orgId },
            include: [
                { model: User, as: 'staff', include: [{ model: StaffProfile, as: 'profile', attributes: ['name'] }] },
                { model: SalesIncentiveRule, as: 'rule', attributes: ['name'] },
                { model: Order, as: 'order', attributes: ['id', 'totalAmount'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        return res.json({ success: true, approvals });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, message: 'Failed to load approvals' });
    }
});

// Update Achievement (Edit Amount or Status)
router.put('/approvals/:id', async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const { incentiveAmount, status, remarks } = req.body;
        const item = await StaffSalesIncentive.findOne({ where: { id: req.params.id, orgAccountId: orgId } });
        if (!item) return res.status(404).json({ success: false, message: 'Incentive record not found' });

        await item.update({
            incentiveAmount: incentiveAmount !== undefined ? incentiveAmount : item.incentiveAmount,
            status: status || item.status,
            remarks: remarks !== undefined ? remarks : item.remarks,
            approvedAt: (status === 'approved' && item.status !== 'approved') ? new Date() : item.approvedAt
        });

        return res.json({ success: true, item });
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Failed to update incentive' });
    }
});

// List Assignments
router.get('/assignments', async (req, res) => {
    try {
        const orgId = getOrgId(req);
        // Fetch all staff and their assigned incentive rules
        const staff = await User.findAll({
            where: { orgAccountId: orgId, role: 'staff' },
            include: [
                { model: StaffProfile, as: 'profile', attributes: ['name', 'phone'] },
                {
                    model: StaffIncentiveRule,
                    as: 'incentiveRuleAssignments',
                    where: { active: true },
                    required: false,
                    include: [{ model: SalesIncentiveRule, as: 'rule' }]
                }
            ]
        });

        const data = staff.map(s => ({
            id: s.id,
            name: s.profile?.name || s.phone || `Staff ${s.id}`,
            phone: s.profile?.phone || s.phone,
            assignedRules: (s.incentiveRuleAssignments || []).map(a => a.rule)
        }));

        return res.json({ success: true, staff: data });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, message: 'Failed to load assignments' });
    }
});

// Update Assignments for a Staff Member
router.post('/assignments', async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const { userId, ruleIds } = req.body;
        if (!userId) return res.status(400).json({ success: false, message: 'User ID required' });

        // Transactional approach could be better but let's do direct for now
        await StaffIncentiveRule.destroy({ where: { staffUserId: userId, orgAccountId: orgId } });

        if (Array.isArray(ruleIds) && ruleIds.length > 0) {
            const records = ruleIds.map(rid => ({
                orgAccountId: orgId,
                staffUserId: userId,
                incentiveRuleId: rid,
                active: true
            }));
            await StaffIncentiveRule.bulkCreate(records);
        }

        return res.json({ success: true, message: 'Assignments updated' });
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Failed to update assignments' });
    }
});

// Bulk Update Assignments for ALL Staff
router.post('/assignments/bulk', async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const { ruleIds } = req.body;

        // 1. Get all active staff users in the org
        const staff = await User.findAll({
            where: { orgAccountId: orgId, role: 'staff', active: true },
            attributes: ['id']
        });

        const staffIds = staff.map(s => s.id);
        if (staffIds.length === 0) {
            return res.json({ success: true, message: 'No active staff found' });
        }

        // 2. Remove existing assignments for all these staff
        await StaffIncentiveRule.destroy({
            where: {
                staffUserId: { [require('sequelize').Op.in]: staffIds },
                orgAccountId: orgId
            }
        });

        // 3. Create new records
        if (Array.isArray(ruleIds) && ruleIds.length > 0) {
            const records = [];
            for (const uid of staffIds) {
                for (const rid of ruleIds) {
                    records.push({
                        orgAccountId: orgId,
                        staffUserId: uid,
                        incentiveRuleId: rid,
                        active: true
                    });
                }
            }
            await StaffIncentiveRule.bulkCreate(records);
        }

        return res.json({ success: true, message: `Assignments updated for ${staffIds.length} staff` });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, message: 'Failed to update bulk assignments' });
    }
});

module.exports = router;
