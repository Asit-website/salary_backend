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
const subscriptionRoutes = require('./src/routes/subscription');
const rolesRoutes = require('./src/routes/roles');
const userAccessRoutes = require('./src/routes/userAccess');
const letterRoutes = require('./src/routes/letter');
const { tenantEnforce } = require('./src/middleware/tenant');
const { scheduleSubscriptionSweep } = require('./src/jobs/subscriptionSweep');
const { scheduleSubscriptionExpiryReminders } = require('./src/jobs');
const { verifyEmailConfig } = require('./src/services/emailService');

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

//this

// Serve PDF Viewer Page (HTML Wrapper) to force open in browser
app.get('/view-pdf/:month/:filename', (req, res) => {
  const { month, filename } = req.params;
  const fileUrl = `/uploads/payslips/${month}/${filename}`;
  // Return HTML with embedded PDF
  res.send(`
    <html>
      <head>
        <title>Payslip ${month}</title>
        <style>body, html { margin: 0; height: 100%; overflow: hidden; }</style>
      </head>
      <body>
        <iframe src="${fileUrl}" width="100%" height="100%" style="border:none;">
          <p>Your browser does not support PDFs. <a href="${fileUrl}">Download the PDF</a>.</p>
        </iframe>
      </body>
    </html>
  `);
});

// Explicitly serve payslips with inline headers (for the iframe source)
app.get('/uploads/payslips/:month/:filename', (req, res) => {
  const { month, filename } = req.params;
  const filePath = path.join(uploadsDir, 'payslips', month, filename);
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`); // Force open with filename
    res.setHeader('Cache-Control', 'no-cache');
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.status(404).send('File not found');
  }
});

app.use('/uploads', express.static(uploadsDir));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/admin/letters', letterRoutes);
app.use('/auth', authRoutes);
app.use('/admin/user-access', userAccessRoutes);
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
app.use('/subscription', subscriptionRoutes);
app.use('/admin/roles', rolesRoutes);
app.use('/mobile/roles', rolesRoutes);

const port = Number(process.env.PORT || 4000);

initDb()
  .then(async () => {
    // Verify email configuration
    try {
      const emailConfigured = await verifyEmailConfig();
      if (emailConfigured) {
        console.log('✅ Email service configured successfully');
      } else {
        console.log('⚠️  Email service configuration failed - emails will not be sent');
      }
    } catch (emailError) {
      console.log('⚠️  Email service verification failed:', emailError.message);
    }

    // Start background job to auto-expire subscriptions and disable orgs
    try { scheduleSubscriptionSweep(); } catch (_) { }

    // Start subscription expiry reminder job
    try { scheduleSubscriptionExpiryReminders(); } catch (_) { }
    // app.listen(port, () => {
    //   console.log(`Backend running on http://localhost:${port}`);
    // });
    app.listen(port, "0.0.0.0", () => {
      console.log(`🚀 Backend running on port ${port}`);
    });

  })
  .catch((e) => {
    console.error('Failed to init DB', e);
    process.exit(1);
  });
