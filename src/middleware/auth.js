const jwt = require('jsonwebtoken');
const { continuousVerify } = require('./continuousAuth');
const { verifyDevice } = require('./verifyDevice');
const { checkGeoVelocity } = require('./geoVelocity');

function authRequired(req, res, next) {
  try {
    const hdr = req.headers.authorization || '';
    let token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;

    // Support token in query for downloads
    if (!token && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Missing token due to lags of internet or not properly authorized' });
    }

    const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
    const payload = jwt.verify(token, secret);
    req.user = payload;

    // Slide session activity (throttled to once every 5 minutes to reduce DB load)
    try {
      const deviceFingerprint = req.headers['x-device-fingerprint'] || null;
      const { refreshToken } = req.cookies || {};
      const queryWhere = { userId: payload.id };
      
      if (deviceFingerprint) {
        queryWhere.deviceFingerprint = deviceFingerprint;
      } else if (refreshToken) {
        queryWhere.token = refreshToken;
      } else {
        queryWhere.id = 0; // Skip lookup if no identifiers
      }

      if (queryWhere.id !== 0) {
        const { RefreshToken } = require('../models');
        RefreshToken.findOne({ where: queryWhere }).then(session => {
          if (session) {
            const now = new Date();
            const lastActivity = session.lastActivityAt ? new Date(session.lastActivityAt) : null;
            if (!lastActivity || (now - lastActivity) > 5 * 60 * 1000) {
              session.update({ lastActivityAt: now }).catch(() => {});
            }
          }
        }).catch(() => {});
      }
    } catch (_) {}
    
    // Perform continuous validation of database status (Zero Trust)
    return continuousVerify(req, res, (err) => {
      if (err) return next(err);
      // Perform device verification and auto-registration (Zero Trust)
      return verifyDevice(req, res, (err2) => {
        if (err2) return next(err2);
        // Perform Geo-Velocity & IP reputation checks (Zero Trust)
        return checkGeoVelocity(req, res, next);
      });
    });
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

module.exports = { authRequired };



