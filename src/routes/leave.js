const express = require('express');
const { Op } = require('sequelize');

const { LeaveRequest, User, StaffProfile, StaffLeaveAssignment, LeaveTemplate, LeaveTemplateCategory, LeaveBalance, LeaveEncashment, OrgAccount, StaffWeeklyOffAssignment, WeeklyOffTemplate, StaffHolidayAssignment, HolidayTemplate, HolidayDate } = require('../models');
const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { tenantEnforce } = require('../middleware/tenant');

const router = express.Router();
const { getMonthWeekNumber, isWeeklyOffForDate } = require('./weeklyOff');
const { formatDate } = require('../utils/dateUtils');

router.use(authRequired);
router.use(tenantEnforce);

function getCycleRange(cycle, forDate /* YYYY-MM-DD */, tpl = null) {
  const d = new Date(`${forDate}T00:00:00`);
  const y = d.getFullYear();
  const m = d.getMonth();
  const dt = d.getDate();

  if (cycle === 'yearly') {
    let startMonth = 0; // Jan
    let startDay = 1;
    if (tpl && tpl.cycleStartDate) {
      const csd = new Date(tpl.cycleStartDate);
      startMonth = csd.getMonth();
      startDay = csd.getDate();
    }
    let start = new Date(y, startMonth, startDay);
    if (d < start) {
      start = new Date(y - 1, startMonth, startDay);
    }
    const end = new Date(start.getFullYear() + 1, startMonth, startDay - 1);
    return { start: formatDate(start), end: formatDate(end) };
  }

  if (cycle === 'quarterly') {
    let startMonth = 0; // Jan
    let startDay = 1;
    if (tpl && tpl.cycleStartDate) {
      const csd = new Date(tpl.cycleStartDate);
      startMonth = csd.getMonth();
      startDay = csd.getDate();
    }
    const monthDiff = (m - startMonth + 12) % 12;
    const qIndex = Math.floor(monthDiff / 3);
    const cycleStartMonth = (startMonth + (qIndex * 3)) % 12;
    let cycleStartYear = y;
    if (m < startMonth && cycleStartMonth >= startMonth) cycleStartYear--;
    const start = new Date(cycleStartYear, cycleStartMonth, startDay);
    if (d < start) {
      const prevStart = new Date(start.getFullYear(), start.getMonth() - 3, startDay);
      return { start: formatDate(prevStart), end: formatDate(new Date(start.getFullYear(), start.getMonth(), startDay - 1)) };
    }
    const end = new Date(start.getFullYear(), start.getMonth() + 3, startDay - 1);
    return { start: formatDate(start), end: formatDate(end) };
  }

  if (cycle === 'monthly') {
    let startDay = 1;
    if (tpl && tpl.cycleStartDay) {
      startDay = Number(tpl.cycleStartDay);
    }
    let start = new Date(y, m, startDay);
    if (dt < startDay) {
      start = new Date(y, m - 1, startDay);
    }
    const end = new Date(start.getFullYear(), start.getMonth() + 1, startDay - 1);
    return { start: formatDate(start), end: formatDate(end) };
  }

  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0);
  return { start: formatDate(start), end: formatDate(end) };
}

function getPrevCycleRange(cycle, forDate /* YYYY-MM-DD */, tpl = null) {
  const current = getCycleRange(cycle, forDate, tpl);
  const prevDate = new Date(new Date(`${current.start}T00:00:00`).getTime() - 86400000);
  return getCycleRange(cycle, formatDate(prevDate), tpl);
}

/**
 * Helper to get the effective leave balance for a user.
 * If a row in LeaveBalance exists, it uses it.
 * Otherwise, it calculates balance based on the Template Category.
 */
async function getEffectiveLeaveBalance(userId, categoryKey, onDate) {
  const tpl = await getActiveLeaveTemplateForUser(userId, onDate);
  if (!tpl) return null;

  const cyc = tpl.cycle || 'monthly';
  const { start, end } = getCycleRange(cyc, onDate, tpl);
  const key = String(categoryKey).toLowerCase();

  const lb = await LeaveBalance.findOne({ where: { userId, categoryKey: key, cycleStart: start, cycleEnd: end } });

  const catCfg = (tpl.categories || []).find(c => String(c.key).toLowerCase() === key);
  if (!catCfg) return null;

  const total = Number(catCfg.leaveCount || 0);

  if (lb) {
    const used = Number(lb.used || 0);
    const allocated = Number(lb.allocated || total);
    const carried = Number(lb.carriedForward || 0);
    const remaining = Number(lb.remaining || Math.max(0, allocated - used));
    return { lb, total: allocated, used, remaining, start, end, cycle: cyc, carriedForward: carried };
  }

  // Fallback: derive used from approved requests within cycle when balance row is missing
  // ALSO: check carry forward from previous cycle
  let carry = 0;
  const prev = getPrevCycleRange(cyc, onDate, tpl);
  const prevBal = await LeaveBalance.findOne({ where: { userId, categoryKey: key, cycleStart: prev.start, cycleEnd: prev.end } });
  
  if (prevBal) {
    const rem = Number(prevBal.remaining || 0);
    const isCarryForward = !!catCfg.carryForward;
    const rule = String(catCfg.unusedRule || 'lapse');
    if (isCarryForward || rule === 'carry_forward') {
      const cap = catCfg.carryLimitDays == null ? rem : Math.min(rem, Number(catCfg.carryLimitDays));
      carry = cap;
    }
  }

  const reqs = await LeaveRequest.findAll({
    where: {
      userId,
      status: 'APPROVED',
      categoryKey: key,
      startDate: { [Op.gte]: start },
      endDate: { [Op.lte]: end },
    }
  }).catch(() => []);

  const totalWithCarry = total + carry;
  const usedDays = Array.isArray(reqs) ? reqs.reduce((s, r) => s + (Number(r.days || 0) || 0), 0) : 0;
  const used = Math.min(totalWithCarry, Math.max(0, usedDays));
  const remaining = Math.max(0, totalWithCarry - used);

  return { lb: null, total: totalWithCarry, used, remaining, start, end, cycle: cyc, carriedForward: carry };
}

// STAFF/ADMIN: get leave categories and balances for current cycle
router.get('/categories', requireRole(['staff', 'admin', 'superadmin']), async (req, res) => {
  try {
    const forDate = typeof req.query.date === 'string' && req.query.date.match(/^\d{4}-\d{2}-\d{2}$/)
      ? req.query.date
      : new Date().toISOString().slice(0, 10);

    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    const userId = (isAdmin && req.query.userId) ? Number(req.query.userId) : req.user.id;

    const tpl = await getActiveLeaveTemplateForUser(userId, forDate);
    if (!tpl) {
      const cycle = 'monthly';
      const { start, end } = getCycleRange(cycle, forDate);
      return res.json({
        success: true, cycle: { type: cycle, start, end }, categories: []
      });
    }

    const cycle = tpl.cycle || 'monthly';
    const { start, end } = getCycleRange(cycle, forDate, tpl);

    const categories = await Promise.all((tpl.categories || []).map(async (c) => {
      const balanceInfo = await getEffectiveLeaveBalance(userId, c.key, forDate);
      if (!balanceInfo) {
        return { key: c.key, name: c.name, total: Number(c.leaveCount || 0), used: 0, remaining: Number(c.leaveCount || 0) };
      }
      return {
        key: String(c.key).toLowerCase(),
        name: c.name,
        total: balanceInfo.total,
        used: balanceInfo.used,
        remaining: balanceInfo.remaining
      };
    }));

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

// STAFF/ADMIN: create leave request
router.post('/', requireRole(['staff', 'admin', 'superadmin']), async (req, res) => {
  try {
    const { startDate, endDate, leaveType, reason, categoryKey, userId: targetUserId, status: requestedStatus } = req.body || {};

    if (!startDate || !endDate || !leaveType) {
      return res.status(400).json({ success: false, message: 'startDate, endDate and leaveType are required' });
    }

    // Determine target user
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    const userId = (isAdmin && targetUserId) ? Number(targetUserId) : req.user.id;

    const sd = new Date(`${startDate}T00:00:00`);
    const ed = new Date(`${endDate}T00:00:00`);
    if (Number.isNaN(sd.getTime()) || Number.isNaN(ed.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date format' });
    }
    if (ed < sd) {
      return res.status(400).json({ success: false, message: 'endDate must be >= startDate' });
    }

    // Compute requested days
    const days = Math.round((ed - sd) / (24 * 3600 * 1000)) + 1;

    // Load target user's leave template on start date
    const tpl = await getActiveLeaveTemplateForUser(userId, startDate);
    let approvalLevelRequired = null;
    let catKey = categoryKey || null;
    if (tpl) {
      approvalLevelRequired = Number(tpl.approvalLevel || 1);
      if (catKey) {
        const exists = (tpl.categories || []).some((c) => String(c.key).toLowerCase() === String(catKey).toLowerCase());
        if (!exists) return res.status(400).json({ success: false, message: 'Invalid categoryKey for assigned template' });
        catKey = String(catKey).toLowerCase();

        // CHECK BALANCE BEFORE APPLYING
        const balanceInfo = await getEffectiveLeaveBalance(userId, catKey, startDate);
        if (balanceInfo) {
          const totalRequested = days;
          if (balanceInfo.remaining < totalRequested) {
            return res.status(400).json({
              success: false,
              message: `Insufficient balance. Staff has only ${balanceInfo.remaining} leaves remaining.`
            });
          }
        }
      } else {
        return res.status(400).json({ success: false, message: 'Leave category is required' });
      }
    } else {
      return res.status(400).json({ success: false, message: 'No leave template assigned to target user.' });
    }

    // Admin created leaves can be pre-approved
    const finalStatus = (isAdmin && requestedStatus === 'APPROVED') ? 'APPROVED' : 'PENDING';
    let paidDays = 0;
    let unpaidDays = 0;

    if (finalStatus === 'APPROVED') {
        // If pre-approved by admin, we must deduct balance immediately
        const eff = await getEffectiveLeaveBalance(userId, catKey, startDate);
        if (!eff) return res.status(400).json({ success: false, message: 'Failed to resolve balance for approval' });

        const { lb, total: totalForCycle, remaining: remainingBefore, start, end, carriedForward } = eff;
        paidDays = days;
        
        if (!lb) {
            await LeaveBalance.create({
                userId,
                categoryKey: catKey,
                cycleStart: start,
                cycleEnd: end,
                allocated: totalForCycle,
                carriedForward: carriedForward || 0,
                used: paidDays,
                remaining: Math.max(0, totalForCycle - paidDays),
                orgAccountId: req.tenantOrgAccountId
            });
        } else {
            const used = Number(lb.used || 0) + paidDays;
            const remaining = Math.max(0, Number(lb.remaining || 0) - paidDays);
            await lb.update({ used, remaining });
        }
    }

    const lr = await LeaveRequest.create({
      userId,
      orgAccountId: req.tenantOrgAccountId,
      startDate,
      endDate,
      leaveType,
      categoryKey: catKey,
      days,
      approvalLevelRequired,
      approvalLevelDone: finalStatus === 'APPROVED' ? approvalLevelRequired : 0,
      reason: reason || 'Created by Admin',
      status: finalStatus,
      reviewedBy: finalStatus === 'APPROVED' ? req.user.id : null,
      reviewedAt: finalStatus === 'APPROVED' ? new Date() : null,
      paidDays,
      unpaidDays
    });

    return res.json({ success: true, leave: lr });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to create leave request' });
  }
});

// STAFF/ADMIN: check if range contains weekly off or holiday
router.get('/check-range', requireRole(['staff', 'admin', 'superadmin']), async (req, res) => {
  try {
    const { start, end, userId: targetUserId } = req.query;
    if (!start || !end) return res.json({ success: true, conflict: false });

    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    const userId = (isAdmin && targetUserId) ? Number(targetUserId) : req.user.id;

    const s = new Date(`${start}T00:00:00`);
    const e = new Date(`${end}T00:00:00`);

    // Fetch Weekly Offs
    const woRows = await StaffWeeklyOffAssignment.findAll({ 
      where: { userId }, 
      include: [{ model: WeeklyOffTemplate, as: 'template' }] 
    });

    // Fetch Holidays
    const hAsg = await StaffHolidayAssignment.findOne({
      where: { userId, effectiveFrom: { [Op.lte]: end } },
      order: [['effectiveFrom', 'DESC']],
      include: [{ model: HolidayTemplate, as: 'template', include: [{ model: HolidayDate, as: 'holidays', where: { active: { [Op.ne]: false } }, required: false }] }]
    });

    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      const dayNum = d.getDate();

      // Check Weekly Off
      for (const asg of woRows) {
        const ef = new Date(asg.effectiveFrom);
        const et = asg.effectiveTo ? new Date(asg.effectiveTo) : null;
        if (d >= ef && (!et || d <= et)) {
          let raw = asg.template?.config;
          while (typeof raw === 'string' && raw.trim().startsWith('[')) {
            try { raw = JSON.parse(raw); } catch (_) { break; }
          }
          if (isWeeklyOffForDate(Array.isArray(raw) ? raw : [], d)) {
            return res.json({ success: true, conflict: true, type: 'weekly_off', date: dateStr, day: dayNum, message: `${dayNum} is weekly off on this date range please change range` });
          }
        }
      }

      // Check Holiday
      if (hAsg?.template?.holidays) {
        const isH = hAsg.template.holidays.some(h => String(h.date) === dateStr);
        if (isH) {
          return res.json({ success: true, conflict: true, type: 'holiday', date: dateStr, day: dayNum, message: `${dayNum} is holiday on this date range please change range` });
        }
      }
    }

    return res.json({ success: true, conflict: false });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: 'Failed to check range' });
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
    const where = { userId: req.user.id, orgAccountId: req.tenantOrgAccountId };
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
    const userId = req.query.userId;
    const where = { orgAccountId: req.tenantOrgAccountId };
    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) where.status = status;
    if (userId) where.userId = userId;
    const rows = await LeaveRequest.findAll({
      where,
      include: [
        {
          model: User, as: 'user',
          attributes: ['id', 'phone', 'role'],
          include: [{ model: StaffProfile, as: 'profile', attributes: ['name', 'staffId'] }]
        },
        { model: User, as: 'reviewer', attributes: ['id', 'phone', 'role'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    const leaves = await Promise.all(rows.map(async (r) => {
      const it = r.toJSON ? r.toJSON() : r;
      let paid = it.paidDays;
      let unpaid = it.unpaidDays;
      let categoryName = null;
      if (it.status === 'APPROVED' && (paid == null && unpaid == null)) {
        const isUnpaid = String(it.categoryKey || 'unpaid').toLowerCase() === 'unpaid';
        const days = Number(it.days || 0) || 0;
        paid = isUnpaid ? 0 : days;
        unpaid = isUnpaid ? days : 0;
      }
      if (it.categoryKey) {
        const tpl = await getActiveLeaveTemplateForUser(it.userId, String(it.startDate));
        const category = (tpl?.categories || []).find(c => String(c.key).toLowerCase() === String(it.categoryKey).toLowerCase());
        categoryName = category?.name || null;
      }
      return { ...it, categoryName, paidDays: Number(paid || 0), unpaidDays: Number(unpaid || 0) };
    }));
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

    const record = await LeaveRequest.findOne({ where: { id, orgAccountId: req.tenantOrgAccountId } });
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

    // Final approval: deduct balance using effective balance helper
    const startDate = record.startDate;
    const eff = await getEffectiveLeaveBalance(record.userId, record.categoryKey || '', startDate);
    
    if (!eff) {
       return res.status(400).json({ success: false, message: 'Leave category missing or template not found. Only company provided leaves can be approved.' });
    }

    const { lb, total: totalForCycle, remaining: remainingBefore, start, end, carriedForward } = eff;
    const catKey = String(record.categoryKey).toLowerCase();

    if (catKey === 'unpaid') {
      return res.status(400).json({ success: false, message: 'Unpaid leave is no longer allowed. Only company provided leaves can be approved.' });
    }

    const need = Number(record.days || 0);
    if (need > remainingBefore) {
      return res.status(400).json({ success: false, message: `Insufficient balance. This staff has only ${remainingBefore} leaves remaining.` });
    }

    const paidDays = need;
    const unpaidDays = 0;

    if (!lb) {
      // Create balance row if missing, using the derived total (which includes carry forward)
      await LeaveBalance.create({
        userId: record.userId,
        categoryKey: catKey,
        cycleStart: start,
        cycleEnd: end,
        allocated: totalForCycle,
        carriedForward: carriedForward || 0,
        used: paidDays,
        remaining: Math.max(0, totalForCycle - paidDays),
        orgAccountId: record.orgAccountId || req.tenantOrgAccountId || null
      });
    } else {
      const used = Number(lb.used || 0) + paidDays;
      const remaining = Math.max(0, Number(lb.remaining || 0) - paidDays);
      await lb.update({ used, remaining });
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

// --- LEAVE ENCASHMENT ---

// STAFF: claim encashment
router.post('/encash/claim', requireRole(['staff']), async (req, res) => {
  try {
    const { categoryKey, days, monthKey } = req.body || {};
    if (!categoryKey || !days || !monthKey) {
      return res.status(400).json({ success: false, message: 'categoryKey, days and monthKey (YYYY-MM) are required' });
    }

    // Check if enough balance exists
    const balanceInfo = await getEffectiveLeaveBalance(req.user.id, categoryKey, new Date().toISOString().slice(0, 10));
    if (!balanceInfo) return res.status(400).json({ success: false, message: 'Invalid leave category or no active template' });

    if (balanceInfo.remaining < Number(days)) {
      return res.status(400).json({ success: false, message: 'Insufficient leave balance for encashment' });
    }

    const claim = await LeaveEncashment.create({
      userId: req.user.id,
      orgAccountId: req.tenantOrgAccountId,
      categoryKey: categoryKey.toLowerCase(),
      days,
      monthKey,
      status: 'PENDING'
    });

    return res.json({ success: true, claim });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: 'Failed to submit encashment claim' });
  }
});

// STAFF: list my own encashment claims
router.get('/encash/claims/me', requireRole(['staff']), async (req, res) => {
  try {
    const claims = await LeaveEncashment.findAll({
      where: { userId: req.user.id, orgAccountId: req.tenantOrgAccountId },
      order: [['createdAt', 'DESC']]
    });
    return res.json({ success: true, claims });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load your encashment claims' });
  }
});

// ADMIN: list encashment claims
router.get('/encash/claims', requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const where = { orgAccountId: req.tenantOrgAccountId };

    const claims = await LeaveEncashment.findAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['id', 'phone'], include: [{ model: StaffProfile, as: 'profile', attributes: ['name', 'staffId'] }] }],
      order: [['createdAt', 'DESC']]
    });

    return res.json({ success: true, claims });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load encashment claims' });
  }
});

// ADMIN: Review encashment claim
router.post('/encash/review', requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { id, status, reviewNote } = req.body || {};
    if (!id || !['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'id and status (APPROVED/REJECTED) are required' });
    }

    const claim = await LeaveEncashment.findOne({ where: { id, orgAccountId: req.tenantOrgAccountId } });
    if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });

    if (claim.status !== 'PENDING') return res.status(400).json({ success: false, message: 'Claim already processed' });

    if (status === 'REJECTED') {
      await claim.update({ status: 'REJECTED', reviewedBy: req.user.id, reviewedAt: new Date(), reviewNote });
      return res.json({ success: true, claim });
    }

    // Process Approval: Deduct from LeaveBalance
    const balanceInfo = await getEffectiveLeaveBalance(claim.userId, claim.categoryKey, new Date().toISOString().slice(0, 10));
    if (!balanceInfo || balanceInfo.remaining < Number(claim.days)) {
      return res.status(400).json({ success: false, message: 'Insufficient leave balance at time of approval' });
    }

    // Update balance
    let lb = balanceInfo.lb;
    const daysToEncash = Number(claim.days);

    if (lb) {
      const encashed = Number(lb.encashed || 0) + daysToEncash;
      const remaining = Number(lb.remaining || 0) - daysToEncash;
      await lb.update({ encashed, remaining });
    } else {
      // Create balance row if missing
      lb = await LeaveBalance.create({
        userId: claim.userId,
        categoryKey: claim.categoryKey.toLowerCase(),
        cycleStart: balanceInfo.start,
        cycleEnd: balanceInfo.end,
        allocated: balanceInfo.total,
        used: balanceInfo.used,
        encashed: daysToEncash,
        remaining: balanceInfo.remaining - daysToEncash,
        orgAccountId: req.tenantOrgAccountId
      });
    }

    await claim.update({
      status: 'APPROVED',
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
      reviewNote
    });

    return res.json({ success: true, claim });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: 'Failed to process encashment claim' });
  }
});

module.exports = router;
