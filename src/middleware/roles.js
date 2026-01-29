function requireRole(roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    if (!req.user?.role) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }

    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    return next();
  };
}

module.exports = { requireRole };
