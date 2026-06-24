const express = require('express');
const router = express.Router();
const tallyService = require('../services/tallyService');
const { authRequired } = require('../middleware/auth');
const { tenantEnforce } = require('../middleware/tenant');
const path = require('path');
const fs = require('fs');

router.use(authRequired);
router.use(tenantEnforce);

router.get('/download-bridge', async (req, res) => {
  try {
    const filePath = path.join(__dirname, '..', '..', 'tally_bridge_agent', 'dist', 'tally-bridge-agent.exe');
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Disposition', 'attachment; filename="vetansutra-tally-bridge.exe"');
      res.setHeader('Content-Type', 'application/octet-stream');
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.status(404).json({ success: false, message: 'Bridge agent executable not found on server' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/config', async (req, res) => {
  try {
    const config = await tallyService.getTallyConfig(req.user.orgAccountId);
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/config', async (req, res) => {
  try {
    const config = await tallyService.saveTallyConfig(req.user.orgAccountId, req.body);
    res.json({ success: true, config, message: 'Tally configuration saved successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/xml/:cycleId', async (req, res) => {
  try {
    const xml = await tallyService.generateTallyXML(req.user.orgAccountId, req.params.cycleId);
    res.set('Content-Type', 'text/xml');
    res.send(xml);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/preview/:cycleId', async (req, res) => {
  try {
    const preview = await tallyService.getPreviewData(req.user.orgAccountId, req.params.cycleId);
    res.json({ success: true, preview });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
