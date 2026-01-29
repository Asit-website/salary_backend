const express = require('express');
const { authRequired } = require('../middleware/auth');
const { upload } = require('../upload');
const { PatrolLog, Site, SiteCheckpoint, AppSetting } = require('../models');

const router = express.Router();

router.use(authRequired);

function haversine(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

router.post('/patrol/checkin', upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'signature', maxCount: 1 },
]), async (req, res) => {
  try {
    const { siteId, checkpointId, lat, lng, otp } = req.body || {};
    const sid = Number(siteId);
    if (!Number.isFinite(sid)) return res.status(400).json({ success: false, message: 'siteId required' });
    const site = await Site.findByPk(sid);
    if (!site) return res.status(404).json({ success: false, message: 'Site not found' });

    const cid = checkpointId !== undefined && checkpointId !== null && checkpointId !== '' ? Number(checkpointId) : null;
    let checkpoint = null;
    if (Number.isFinite(cid)) {
      checkpoint = await SiteCheckpoint.findOne({ where: { id: cid, siteId: sid } });
    }

    const nlat = lat !== undefined && lat !== null && lat !== '' ? Number(lat) : null;
    const nlng = lng !== undefined && lng !== null && lng !== '' ? Number(lng) : null;

    const files = req.files || {};
    const photo = Array.isArray(files.photo) ? files.photo[0] : null;
    const signature = Array.isArray(files.signature) ? files.signature[0] : null;

    const created = await PatrolLog.create({
      userId: req.user.id,
      siteId: sid,
      checkpointId: checkpoint ? checkpoint.id : null,
      lat: nlat,
      lng: nlng,
      otp: otp || null,
      photoUrl: photo ? `/uploads/${photo.filename}` : null,
      signatureUrl: signature ? `/uploads/${signature.filename}` : null,
      supervisorVerified: false,
      clientConfirmed: false,
      penaltyAmount: 0,
      incentiveAmount: 0,
      penaltyReason: null,
    });

    let features = { securityPhotoRequired: false, securityGeoRequired: false, securitySignatureOrOtpRequired: false };
    try {
      const row = await AppSetting.findOne({ where: { key: 'org_config' } });
      if (row?.value) {
        const cfg = JSON.parse(row.value);
        features = Object.assign(features, cfg?.features || {});
      }
    } catch (_) {}

    if (features.securityPhotoRequired && !created.photoUrl) {
      return res.status(400).json({ success: false, message: 'Photo required' });
    }

    if (features.securityGeoRequired) {
      const hasGeo = Number.isFinite(created.lat) && Number.isFinite(created.lng);
      if (!hasGeo) return res.status(400).json({ success: false, message: 'Location required' });
      let ok = true;
      if (checkpoint && Number.isFinite(checkpoint.lat) && Number.isFinite(checkpoint.lng) && Number.isFinite(checkpoint.radiusM)) {
        const dist = haversine(created.lat, created.lng, Number(checkpoint.lat), Number(checkpoint.lng));
        ok = dist <= Number(checkpoint.radiusM);
      } else if (Number.isFinite(site.lat) && Number.isFinite(site.lng) && Number.isFinite(site.geofenceRadiusM)) {
        const dist = haversine(created.lat, created.lng, Number(site.lat), Number(site.lng));
        ok = dist <= Number(site.geofenceRadiusM);
      }
      if (!ok) return res.status(400).json({ success: false, message: 'Outside geofence' });
    }

    if (features.securitySignatureOrOtpRequired) {
      const has = !!created.signatureUrl || !!created.otp;
      if (!has) return res.status(400).json({ success: false, message: 'Signature or OTP required' });
    }

    return res.json({ success: true, patrolId: created.id });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to check-in' });
  }
});

router.get('/patrol/today', async (req, res) => {
  try {
    const dateIso = new Date().toISOString().slice(0, 10);
    const start = new Date(`${dateIso}T00:00:00`);
    const end = new Date(`${dateIso}T23:59:59.999`);
    const rows = await PatrolLog.findAll({ where: { userId: req.user.id, checkInTime: { $between: [start, end] } } });
    return res.json({ success: true, logs: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load patrol logs' });
  }
});

module.exports = router;
