const jwt = require('jsonwebtoken');

function authRequired(req, res, next) {
  try {
    const hdr = req.headers.authorization || '';
    let token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;

    // Support token in query for downloads
    if (!token && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Missing token' });
    }

    const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
    const payload = jwt.verify(token, secret);
    req.user = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

module.exports = { authRequired };
