const path = require('path');
const fs = require('fs');

require('dotenv').config();

const express = require('express');
const cors = require('cors');

const { initDb } = require('./src/db');
const authRoutes = require('./src/routes/auth');
const adminRoutes = require('./src/routes/admin');
const superadminRoutes = require('./src/routes/superadmin');
const attendanceRoutes = require('./src/routes/attendance');
const salesRoutes = require('./src/routes/sales');
const leaveRoutes = require('./src/routes/leave');
const weeklyOffRoutes = require('./src/routes/weeklyOff');
const meRoutes = require('./src/routes/me');
const documentsRoutes = require('./src/routes/documents');
const securityRoutes = require('./src/routes/security');
const salaryTemplateRoutes = require('./src/routes/salaryTemplates');
const { scheduleSubscriptionSweep } = require('./src/jobs/subscriptionSweep');

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use('/uploads', express.static(uploadsDir));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/superadmin', superadminRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/sales', salesRoutes);
app.use('/leave', leaveRoutes);
app.use('/leave/weekly-off', weeklyOffRoutes);
app.use('/me', meRoutes);
app.use('/documents', documentsRoutes);
app.use('/security', securityRoutes);
app.use('/salary-templates', salaryTemplateRoutes);

const port = Number(process.env.PORT || 4000);

initDb()
  .then(() => {
    // Start background job to auto-expire subscriptions and disable orgs
    try { scheduleSubscriptionSweep(); } catch (_) {}
    app.listen(port, () => {
      console.log(`Backend running on http://localhost:${port}`);
    });
  })
  .catch((e) => {
    console.error('Failed to init DB', e);
    process.exit(1);
  });
