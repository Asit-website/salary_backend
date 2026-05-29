const { DeviceInfo } = require('../models');
const { logAudit } = require('../utils/auditLogger');

async function verifyDevice(req, res, next) {
  try {
    // If request has not been authenticated, skip
    if (!req.user || !req.user.id) {
      return next();
    }

    const fingerprint = req.headers['x-device-fingerprint'];
    const platform = req.headers['x-app-platform'] || 'web'; // 'web' or 'mobile-apk'
    const userAgent = req.headers['user-agent'] || 'Unknown';

    // If fingerprint is missing, log a minor security note in Dry-Run mode
    if (!fingerprint) {
      logAudit({
        req,
        action: 'SECURITY_NOTE',
        remarks: `Request received without x-device-fingerprint header for user ${req.user.phone}`,
        details: { platform, userAgent }
      });
      return next(); // Dry-run: let it pass
    }

    // Lookup device for this user
    let device = await DeviceInfo.findOne({
      where: {
        userId: req.user.id,
        deviceId: fingerprint
      }
    });

    if (!device) {
      // Auto-register the device in Dry-Run mode
      device = await DeviceInfo.create({
        userId: req.user.id,
        orgAccountId: req.user.orgAccountId || 0,
        deviceId: fingerprint,
        platform: platform,
        userAgent: userAgent.slice(0, 255),
        isActive: true,
        lastSeenAt: new Date()
      });

      logAudit({
        req,
        action: 'DEVICE_REGISTERED',
        remarks: `New device auto-registered for user ${req.user.phone}. Device ID: ${fingerprint}`,
        details: { platform, userAgent }
      });
    } else {
      // Existing device: Update last seen timestamp
      await device.update({
        lastSeenAt: new Date(),
        userAgent: userAgent.slice(0, 255)
      });
    }

    // Bind device details to req object
    req.deviceInfo = device;

    next();
  } catch (err) {
    console.error('[DEVICE VERIFY EXCEPTION]:', err);
    next(); // Graceful fallback
  }
}

module.exports = { verifyDevice };
