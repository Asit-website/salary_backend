const express = require('express');
const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { StaffWeeklyOffAssignment, WeeklyOffTemplate } = require('../models');

const router = express.Router();

router.use(authRequired);

function getMonthWeekNumber(d) {
  const day = d.getDate();
  return Math.floor((day - 1) / 7) + 1; // 1..5
}

function isWeeklyOffForDate(configArray, jsDate) {
  try {
    const dow = jsDate.getDay(); // 0..6
    const wk = getMonthWeekNumber(jsDate);
    for (const cfg of Array.isArray(configArray) ? configArray : []) {
      if (cfg && Number(cfg.day) === dow) {
        if (cfg.weeks === 'all') return true;
        if (Array.isArray(cfg.weeks) && cfg.weeks.includes(wk)) return true;
      }
    }
    return false;
  } catch (_) { return false; }
}

// STAFF: get my weekly-off dates between start and end (inclusive)
router.get('/my', requireRole(['staff']), async (req, res) => {
  try {
    const { start, end } = req.query || {};
    if (!/\d{4}-\d{2}-\d{2}/.test(String(start)) || !/\d{4}-\d{2}-\d{2}/.test(String(end))) {
      return res.status(400).json({ success: false, message: 'start and end YYYY-MM-DD required' });
    }
    const rows = await StaffWeeklyOffAssignment.findAll({ where: { userId: req.user.id }, include: [{ model: WeeklyOffTemplate, as: 'template' }] });
    const offs = [];
    const s = new Date(String(start));
    const e = new Date(String(end));
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      for (const asg of rows) {
        const ef = new Date(asg.effectiveFrom);
        const et = asg.effectiveTo ? new Date(asg.effectiveTo) : null;
        if (d >= ef && (!et || d <= et)) {
          if (isWeeklyOffForDate(asg.template?.config || [], d)) {
            offs.push(dateStr);
            break;
          }
        }
      }
    }
    return res.json({ success: true, dates: offs });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to get weekly off dates' });
  }
});

module.exports = router;
