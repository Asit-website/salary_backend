process.env.TZ = process.env.TZ || 'Asia/Kolkata';

const path = require('path');
const fs = require('fs');

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const cookieParser = require('cookie-parser');
const { authRequired } = require('./src/middleware/auth');
const { mountSecureUploads } = require('./src/middleware/secureUploads');
const { initDb } = require('./src/db');
const authRoutes = require('./src/routes/auth');
const adminRoutes = require('./src/routes/admin');
const superadminRoutes = require('./src/routes/superadmin');
const attendanceRoutes = require('./src/routes/attendance');
const kioskRoutes = require('./src/routes/kiosk');
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
const salesIncentiveRoutes = require('./src/routes/salesIncentive');
const todoRoutes = require('./src/routes/todo');
const meetingRoutes = require('./src/routes/meeting');
const ticketRoutes = require('./src/routes/ticket');
const taskManagementRoutes = require('./src/routes/taskManagement');
const rosterRoutes = require('./src/routes/roster');
const shiftRotationRoutes = require('./src/routes/shiftRotation');
const aiRoutes = require('./src/routes/ai');
const channelPartnerRoutes = require('./src/routes/channelPartner');
const { verifyEmailConfig } = require('./src/services/emailService');
const superadminMailRoutes = require('./src/routes/superadminMail');
const recruitmentRoutes = require('./src/routes/recruitment');
const socialRoutes = require('./src/routes/social');
const notificationRoutes = require('./src/routes/notification');
const wishesRoutes = require('./src/routes/wishes');




const { tenantEnforce } = require('./src/middleware/tenant');
const { scheduleSubscriptionSweep } = require('./src/jobs/subscriptionSweep');
const { scheduleSubscriptionExpiryReminders, scheduleZktecoSync, scheduleAttendanceReminders, scheduleSocialCelebrations, scheduleMissingCheckoutReminders, scheduleShiftRotationCron, schedulePmsCycleJob, syncAllAppraisalCycles } = require('./src/jobs');
const { ensureCollectionExists } = require('./src/services/awsService');
const { scheduleBulkMailJob } = require('./src/jobs');

const app = express();

// Initialize AWS Rekognition Collection
ensureCollectionExists().then(success => {
  if (success) {
    console.log('AWS Rekognition service initialized.');
  } else {
    console.warn('AWS Rekognition service failed to initialize collections.');
  }
});

const defaultAllowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:8081',
  'http://localhost:19006',
  'https://vetansutra.com',
  'https://web.vetansutra.com',
  'https://backend.vetansutra.com'
];

const envOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...envOrigins])];

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (origin, callback) => {
    // 1. Requests from mobile apps (APK / React Native / Capacitor), Postman, or native webviews without origin or "null"
    if (!origin || origin === 'null' || origin.startsWith('file://')) {
      return callback(null, true);
    }
    // 2. Allow any localhost / 127.0.0.1 on any port, LAN IP, Expo, or vetansutra domain
    if (
      /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin) ||
      origin.startsWith('exp://') ||
      origin.startsWith('capacitor://') ||
      origin.endsWith('.vetansutra.com') ||
      origin === 'https://vetansutra.com' ||
      allowedOrigins.includes(origin)
    ) {
      return callback(null, true);
    }
    // 3. Fallback for non-production environments
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

//this

// Serve PDF Viewer Page (HTML Wrapper) — requires authentication
app.get('/view-pdf/:month/:filename', authRequired, (req, res) => {
  const { month, filename } = req.params;
  const tokenQ = req.query.token ? `?token=${encodeURIComponent(req.query.token)}` : '';
  const fileUrl = `/uploads/payslips/${month}/${filename}${tokenQ}`;
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

mountSecureUploads(app, uploadsDir);

app.use('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/webhook/essl', require('./src/routes/esslWebhook'));
app.use('/auth', authRoutes);
app.use('/kiosk', kioskRoutes);

app.use('/admin/letters', letterRoutes);
app.use('/admin/sales-incentives', salesIncentiveRoutes);

app.use('/admin/user-access', userAccessRoutes);
app.use('/admin/task-management', taskManagementRoutes);
app.use('/admin/recruitment', recruitmentRoutes);
app.use('/admin/social', socialRoutes);
app.use('/admin/notifications', notificationRoutes);
app.use('/admin/wishes', wishesRoutes);
app.use('/channel-partner', channelPartnerRoutes);
app.use(rosterRoutes);
app.use('/admin/shift-rotation', shiftRotationRoutes);
app.use('/admin/ai', aiRoutes);
app.use('/admin/payroll-inspection', require('./src/routes/payrollInspection'));
app.use('/admin', adminRoutes);
app.use('/admin/tally', require('./src/routes/tally'));
app.use('/superadmin/mail', superadminMailRoutes);
app.use('/superadmin', superadminRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/sales', salesRoutes);
app.use('/leave', leaveRoutes);
app.use('/leave/weekly-off', weeklyOffRoutes.router);
app.use('/me', meRoutes);
app.use('/documents', documentsRoutes);
app.use('/security', securityRoutes);
app.use('/salary-templates', salaryTemplateRoutes);
app.use('/subscription', subscriptionRoutes);
app.use('/admin/roles', rolesRoutes);
app.use('/mobile/roles', rolesRoutes);
app.use('/activities', todoRoutes);
app.use('/meetings', meetingRoutes);
app.use('/tickets', ticketRoutes);
app.use('/ai', aiRoutes);
app.use('/ai', aiRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

const port = Number(process.env.PORT || 4000);
const backgroundJobsEnabled = String(process.env.ENABLE_BACKGROUND_JOBS || '').toLowerCase() === 'true'
  && String(process.env.DISABLE_BACKGROUND_JOBS || '').toLowerCase() !== 'true';

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

    // Start ZKTeco biometric sync job
    try { scheduleZktecoSync(); } catch (_) { }

    // Start Attendance Missing Reminder job (5:00 PM IST)
    try { 
      scheduleAttendanceReminders(); 
      // Catch-up check: Only run on startup if server rebooted after 5:00 PM (17:00) IST
      const now = new Date();
      const istMinutes = now.getUTCHours() * 60 + now.getUTCMinutes() + 330;
      const istHour = Math.floor(istMinutes / 60) % 24;
      if (istHour >= 17) {
        const { checkMissingAttendanceAndNotify } = require('./src/jobs/attendanceReminder');
        checkMissingAttendanceAndNotify().catch((err) => console.error('[STARTUP CHECK] Attendance check failed:', err.message));
      }
    } catch (_) { }

    // Start Bulk Mailing job (1-minute interval)
    try { scheduleBulkMailJob(); } catch (_) { }

    // Start Social Celebrations job
    try { scheduleSocialCelebrations(); } catch (_) { }

    // Start Missing Check-Out Email job
    try { scheduleMissingCheckoutReminders(); } catch (_) { }

    // Start Shift Rotation Cron job
    try { scheduleShiftRotationCron(); } catch (_) { }

    // Start PMS Appraisal Cycle status automation job
    try {
      schedulePmsCycleJob();
      syncAllAppraisalCycles();
    } catch (_) { }
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
