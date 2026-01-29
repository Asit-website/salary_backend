const express = require('express');

const { LeaveRequest, User, StaffLeaveAssignment, LeaveTemplate, LeaveTemplateCategory, LeaveBalance } = require('../models');
const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();

router.use(authRequired);

function getCycleRange(cycle, forDate /* YYYY-MM-DD */) {
  const d = new Date(`${forDate}T00:00:00`);
  const y = d.getFullYear();
  const m = d.getMonth();
  if (cycle === 'yearly') return { start: `${y}-01-01`, end: `${y}-12-31` };
  if (cycle === 'quarterly') {
    const q = Math.floor(m / 3);
    const sm = q * 3;
    const em = sm + 2;
    const start = new Date(y, sm, 1);
    const end = new Date(y, em + 1, 0);
    return { start: start.toISOString().slice(0,10), end: end.toISOString().slice(0,10) };
  }
  // Default monthly range
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0);
  return { start: start.toISOString().slice(0,10), end: end.toISOString().slice(0,10) };
}

// STAFF: get my leave categories and balances for current cycle
router.get('/categories', requireRole(['staff']), async (req, res) => {
  try {
    const forDate = typeof req.query.date === 'string' && req.query.date.match(/^\d{4}-\d{2}-\d{2}$/)
      ? req.query.date
      : new Date().toISOString().slice(0, 10);

    const tpl = await getActiveLeaveTemplateForUser(req.user.id, forDate);
    if (!tpl) {
      const cycle = 'monthly';
      const { start, end } = getCycleRange(cycle, forDate);
      // Return only unpaid option when no template assigned
      return res.json({ success: true, cycle: { type: cycle, start, end }, categories: [
        { key: 'unpaid', name: 'Unpaid Leave', total: null, used: null, remaining: null, unlimited: true }
      ] });
    }

    const cycle = tpl.cycle || 'monthly';
    const { start, end } = getCycleRange(cycle, forDate);

    const balances = await LeaveBalance.findAll({ where: { userId: req.user.id, cycleStart: start, cycleEnd: end } });
    const balMap = new Map(balances.map((b) => [String(b.categoryKey).toLowerCase(), b]));

    const categories = await Promise.all((tpl.categories || []).map(async (c) => {
      const key = String(c.key).toLowerCase();
      const b = balMap.get(key);
      const total = Number(c.leaveCount || 0);
      if (b) {
        const used = Number(b.used || 0);
        const remaining = Number(b.remaining || Math.max(0, total - used));
        return { key, name: c.name, total, used, remaining };
      }
      // Fallback: derive used from approved requests within cycle when balance row is missing
      const reqs = await LeaveRequest.findAll({
        where: {
          userId: req.user.id,
          status: 'APPROVED',
          categoryKey: key,
          startDate: { $gte: start },
          endDate: { $lte: end },
        }
      }).catch(() => []);
      const usedDays = Array.isArray(reqs) ? reqs.reduce((s, r) => s + (Number(r.days || 0) || 0), 0) : 0;
      const used = Math.min(total, Math.max(0, usedDays));
      const remaining = Math.max(0, total - used);
      return { key, name: c.name, total, used, remaining };
    }));

    // Always include a static unpaid option without remaining text
    categories.push({ key: 'unpaid', name: 'Unpaid Leave', total: null, used: null, remaining: null, unlimited: true });

    return res.json({ success: true, cycle: { type: cycle, start, end }, categories });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load leave categories' });
  }
});

async function getActiveLeaveTemplateForUser(userId, onDate /* YYYY-MM-DD */) {
  const row = await StaffLeaveAssignment.findOne({
    where: { userId },
    order: [['effectiveFrom', 'DESC']],
    include: [{ model: LeaveTemplate, as: 'template', include: [{ model: LeaveTemplateCategory, as: 'categories' }] }],
  });
  if (!row) return null;
  const ef = row.effectiveFrom;
  const et = row.effectiveTo; // can be null
  if (onDate < ef) return null;
  if (et && onDate > et) return null;
  return row.template;
}

// STAFF: create leave request
router.post('/', requireRole(['staff']), async (req, res) => {
  try {
    const { startDate, endDate, leaveType, reason, categoryKey } = req.body || {};

    if (!startDate || !endDate || !leaveType) {
      return res.status(400).json({ success: false, message: 'startDate, endDate and leaveType are required' });
    }

    const sd = new Date(`${startDate}T00:00:00`);
    const ed = new Date(`${endDate}T00:00:00`);
    if (Number.isNaN(sd.getTime()) || Number.isNaN(ed.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date format' });
    }
    if (ed < sd) {
      return res.status(400).json({ success: false, message: 'endDate must be >= startDate' });
    }

    // Compute requested days (simple inclusive count; sandwich/holidays handled later)
    const days = Math.round((ed - sd) / (24 * 3600 * 1000)) + 1;

    // Load user's leave template on start date
    const tpl = await getActiveLeaveTemplateForUser(req.user.id, startDate);
    let approvalLevelRequired = null;
    let catKey = categoryKey || null;
    if (tpl) {
      approvalLevelRequired = Number(tpl.approvalLevel || 1);
      if (catKey) {
        const exists = (tpl.categories || []).some((c) => String(c.key).toLowerCase() === String(catKey).toLowerCase());
        if (!exists) return res.status(400).json({ success: false, message: 'Invalid categoryKey for assigned template' });
        catKey = String(catKey).toLowerCase();
      }
    }

    const lr = await LeaveRequest.create({
      userId: req.user.id,
      startDate,
      endDate,
      leaveType,
      categoryKey: catKey,
      days,
      approvalLevelRequired,
      reason: reason || null,
      status: 'PENDING',
    });

    return res.json({ success: true, leave: lr });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to create leave request' });
  }
});

// STAFF: cancel pending request
router.delete('/:id', requireRole(['staff']), async (req, res) => {
  try {
    const id = String(req.params.id);
    const record = await LeaveRequest.findByPk(id);
    if (!record || String(record.userId) !== String(req.user.id)) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    if (record.status !== 'PENDING') {
      return res.status(409).json({ success: false, message: 'Only pending requests can be cancelled' });
    }

    await record.destroy();
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to cancel leave request' });
  }
});

// STAFF: list own leaves
router.get('/me', requireRole(['staff']), async (req, res) => {
  try {
    const status = typeof req.query.status === 'string' && req.query.status.trim() ? req.query.status.trim().toUpperCase() : null;
    const where = { userId: req.user.id };
    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) where.status = status;

    const rows = await LeaveRequest.findAll({ where, order: [['createdAt', 'DESC']] });
    const leaves = rows.map((r) => {
      const it = r.toJSON ? r.toJSON() : r;
      let paid = it.paidDays;
      let unpaid = it.unpaidDays;
      if (it.status === 'APPROVED' && (paid == null && unpaid == null)) {
        const isUnpaid = String(it.categoryKey || 'unpaid').toLowerCase() === 'unpaid';
        const days = Number(it.days || 0) || 0;
        paid = isUnpaid ? 0 : days;
        unpaid = isUnpaid ? days : 0;
      }
      return { ...it, paidDays: Number(paid || 0), unpaidDays: Number(unpaid || 0) };
    });
    return res.json({ success: true, leaves });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load leaves' });
  }
});

// ADMIN/SUPERADMIN: list all leaves (filterable)
router.get('/', requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const status = typeof req.query.status === 'string' && req.query.status.trim() ? req.query.status.trim().toUpperCase() : null;
    const where = {};
    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) where.status = status;
    const rows = await LeaveRequest.findAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'phone', 'role'] },
        { model: User, as: 'reviewer', attributes: ['id', 'phone', 'role'] },
      ],
      order: [['createdAt', 'DESC']],
    });
    const leaves = rows.map((r) => {
      const it = r.toJSON ? r.toJSON() : r;
      let paid = it.paidDays;
      let unpaid = it.unpaidDays;
      if (it.status === 'APPROVED' && (paid == null && unpaid == null)) {
        const isUnpaid = String(it.categoryKey || 'unpaid').toLowerCase() === 'unpaid';
        const days = Number(it.days || 0) || 0;
        paid = isUnpaid ? 0 : days;
        unpaid = isUnpaid ? days : 0;
      }
      return { ...it, paidDays: Number(paid || 0), unpaidDays: Number(unpaid || 0) };
    });
    return res.json({ success: true, leaves });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load leaves' });
  }
});

// ADMIN/SUPERADMIN: approve/reject
router.patch('/:id/status', requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const id = String(req.params.id);
    const { status, note } = req.body || {};
    const normalized = String(status || '').toUpperCase();

    if (!['APPROVED', 'REJECTED'].includes(normalized)) {
      return res.status(400).json({ success: false, message: 'status must be APPROVED or REJECTED' });
    }

    const record = await LeaveRequest.findByPk(id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    if (normalized === 'REJECTED') {
      await record.update({
        status: 'REJECTED',
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
        reviewNote: note || null,
      });
      return res.json({ success: true, leave: record });
    }

    // APPROVED path: handle multilevel
    const reqLevels = Number(record.approvalLevelRequired || 1);
    const done = Number(record.approvalLevelDone || 0) + 1;

    if (done < reqLevels) {
      await record.update({ approvalLevelDone: done, reviewNote: note || record.reviewNote });
      return res.json({ success: true, leave: record, message: `Level ${done}/${reqLevels} approved` });
    }

    // Final approval: deduct balance if category present (allow partial unpaid)
    const startDate = record.startDate;
    const tpl = await getActiveLeaveTemplateForUser(record.userId, startDate);
    let catKey = record.categoryKey || null;
    if (tpl && !catKey && Array.isArray(tpl.categories) && tpl.categories.length > 0) {
      // auto-pick first category
      catKey = String(tpl.categories[0].key).toLowerCase();
    }

    let paidDays = null;
    let unpaidDays = null;
    if (catKey) {
      if (catKey === 'unpaid') {
        const need = Number(record.days || 0);
        paidDays = 0;
        unpaidDays = need;
      } else {
      const cyc = tpl ? tpl.cycle || 'monthly' : 'monthly';
      const { start, end } = getCycleRange(cyc, startDate);
      let lb = await LeaveBalance.findOne({ where: { userId: record.userId, categoryKey: catKey, cycleStart: start, cycleEnd: end } });
      const need = Number(record.days || 0);
      // Determine total from template category
      const catCfg = (tpl?.categories || []).find(c => String(c.key).toLowerCase() === String(catKey).toLowerCase());
      const totalForCycle = Number(catCfg?.leaveCount || 0);
      const remainingBefore = lb ? Number(lb.remaining || 0) : Math.max(0, totalForCycle - Number(lb?.used || 0));
      paidDays = Math.min(need, Math.max(0, remainingBefore));
      unpaidDays = Math.max(0, need - paidDays);
      if (paidDays > 0) {
        if (!lb) {
          // Create balance row if missing
          const used = Math.min(totalForCycle, paidDays);
          const remaining = Math.max(0, totalForCycle - used);
          lb = await LeaveBalance.create({
            userId: record.userId,
            categoryKey: catKey,
            cycleStart: start,
            cycleEnd: end,
            total: totalForCycle,
            used,
            remaining,
          });
        } else {
          const used = Number(lb.used || 0) + paidDays;
          const remaining = Math.max(0, Number(lb.remaining || 0) - paidDays);
          await lb.update({ used, remaining });
        }
      }
      }
    } else {
      // No category provided -> treat as unpaid
      const need = Number(record.days || 0);
      paidDays = 0;
      unpaidDays = need;
    }

    await record.update({
      status: 'APPROVED',
      approvalLevelDone: reqLevels,
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
      reviewNote: note || record.reviewNote,
      paidDays,
      unpaidDays,
    });

    return res.json({ success: true, leave: record, paidDays, unpaidDays });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update leave status' });
  }
});

module.exports = router;
