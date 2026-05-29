const { AuditLog } = require('../models');
const { logAudit } = require('../utils/auditLogger');

// Helper to safely calculate physical distance between two lat/long points
function calculateDistance([lat1, lon1], [lat2, lon2]) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function checkGeoVelocity(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      return next();
    }

    // Extract requester IP address
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || 
               req.socket.remoteAddress || 
               req.ip || 
               '127.0.0.1';

    // 1. IP Reputation (Dry-run checking for Proxies / VPNs in headers)
    const viaHeader = req.headers['via'] || '';
    const forwardHeader = req.headers['forwarded'] || '';
    const hasProxyHeaders = viaHeader || forwardHeader.includes('proto=') || req.headers['x-real-ip'];

    if (hasProxyHeaders) {
      logAudit({
        req,
        action: 'SECURITY_NOTE',
        remarks: `Proxy/VPN indicators detected in headers for user ${req.user.phone}`,
        details: { IP: ip, via: viaHeader, forwarded: forwardHeader }
      });
    }

    // 2. Geo-Velocity/Impossible Travel detection
    // Try to load geoip-lite dynamically to avoid crash if not installed
    let geoip;
    try {
      geoip = require('geoip-lite');
    } catch (_) {
      // geoip-lite not installed - fallback silently in Dry-Run
      return next();
    }

    if (geoip && ip !== '127.0.0.1' && ip !== '::1') {
      const currentGeo = geoip.lookup(ip);
      if (currentGeo && currentGeo.ll) {
        // Find user's last successful action log
        const lastLog = await AuditLog.findOne({
          where: { userId: req.user.id, action: 'LOGIN_SUCCESS' },
          order: [['createdAt', 'DESC']]
        });

        if (lastLog && lastLog.ipAddress && lastLog.ipAddress !== ip) {
          const lastGeo = geoip.lookup(lastLog.ipAddress);
          if (lastGeo && lastGeo.ll) {
            const distance = calculateDistance(lastGeo.ll, currentGeo.ll); // in km
            const timeDiff = (new Date() - new Date(lastLog.createdAt)) / 3600000; // in hours

            const requiredSpeed = distance / (timeDiff || 0.001); // km/h
            
            // If physical speed required exceeds standard aviation limits (900 km/h) over > 100km
            if (requiredSpeed > 900 && distance > 100) {
              logAudit({
                req,
                action: 'SECURITY_ALERT',
                remarks: `Impossible travel detected for user ${req.user.phone}! Speed: ${requiredSpeed.toFixed(0)} km/h. Last location: ${lastGeo.city || 'Unknown'}, Current: ${currentGeo.city || 'Unknown'}`,
                details: {
                  lastIp: lastLog.ipAddress,
                  currentIp: ip,
                  distance: `${distance.toFixed(0)} km`,
                  timeDiffHours: timeDiff.toFixed(2)
                }
              });

              // Dry-run mode: We log the alert but let the user pass.
              // In production Phase 3, this would block:
              // return res.status(403).json({ success: false, message: 'Access denied due to geo-velocity anomaly.' });
            }
          }
        }
      }
    }

    next();
  } catch (err) {
    console.error('[GEO VELOCITY EXCEPTION]:', err);
    next();
  }
}

module.exports = { checkGeoVelocity };
