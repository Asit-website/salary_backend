const express = require('express');
const multer = require('multer');
const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { tenantEnforce } = require('../middleware/tenant');
const {
  parseUpload,
  analyzeSheet,
  applyFixes,
  buildStaffDayTimeline,
} = require('../services/payrollInspectionService');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

router.use(authRequired);
router.use(requireRole(['admin', 'superadmin', 'staff']));
router.use(tenantEnforce);

function orgId(req, res) {
  const id = req.tenantOrgAccountId;
  if (!id) {
    res.status(403).json({ success: false, message: 'No organization in context' });
    return null;
  }
  return Number(id);
}

router.post('/parse', upload.single('file'), async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, message: 'Excel file required' });
    }
    const data = await parseUpload(req.file.buffer);
    return res.json({ success: true, ...data });
  } catch (e) {
    console.error('[payroll-inspection] parse', e);
    return res.status(500).json({ success: false, message: e.message || 'Failed to read Excel' });
  }
});

router.post('/analyze', async (req, res) => {
  try {
    const orgAccountId = orgId(req, res);
    if (!orgAccountId) return;
    const { sessionId, sheetName, monthKey, headerRowIndex } = req.body || {};
    if (!sessionId || !sheetName) {
      return res.status(400).json({ success: false, message: 'sessionId and sheetName required' });
    }
    const report = await analyzeSheet({
      orgId: orgAccountId,
      sessionId,
      sheetName,
      monthKey,
      headerRowIndex,
    });
    return res.json({ success: true, report });
  } catch (e) {
    const status = e.status || 500;
    return res.status(status).json({ success: false, message: e.message || 'Analysis failed' });
  }
});

router.get('/day-timeline', async (req, res) => {
  try {
    const orgAccountId = orgId(req, res);
    if (!orgAccountId) return;
    const userId = Number(req.query.userId);
    const monthKey = String(req.query.monthKey || '').trim();
    if (!userId || !/^\d{4}-\d{2}$/.test(monthKey)) {
      return res.status(400).json({ success: false, message: 'userId and monthKey (YYYY-MM) required' });
    }
    const timeline = await buildStaffDayTimeline(orgAccountId, userId, monthKey, {}, []);
    return res.json({ success: true, timeline });
  } catch (e) {
    console.error('[payroll-inspection] day-timeline', e);
    return res.status(500).json({ success: false, message: e.message || 'Failed to load day timeline' });
  }
});

router.post('/apply-fixes', async (req, res) => {
  try {
    const orgAccountId = orgId(req, res);
    if (!orgAccountId) return;
    const { fixes } = req.body || {};
    if (!Array.isArray(fixes) || fixes.length === 0) {
      return res.status(400).json({ success: false, message: 'fixes array required' });
    }
    const results = await applyFixes(orgAccountId, fixes, req.user.id);
    return res.json({ success: true, results });
  } catch (e) {
    console.error('[payroll-inspection] apply-fixes', e);
    return res.status(500).json({ success: false, message: e.message || 'Failed to apply fixes' });
  }
});

module.exports = router;
