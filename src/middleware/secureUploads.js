const path = require('path');
const fs = require('fs');
const { authRequired } = require('./auth');

function resolveUploadPath(requestPath, uploadsDir) {
  let decodedPath = requestPath;
  try {
    decodedPath = decodeURIComponent(requestPath);
  } catch (_) {}
  const normalized = path.normalize(decodedPath).replace(/^(\.\.[/\\])+/, '');
  const fullPath = path.resolve(uploadsDir, normalized);
  const root = path.resolve(uploadsDir);
  if (!fullPath.startsWith(root + path.sep) && fullPath !== root) {
    return null;
  }
  return fullPath;
}

function createSecureUploadHandler(uploadsDir) {
  return async (req, res) => {
    const subPath = req.params[0] || '';
    const filePath = resolveUploadPath(subPath, uploadsDir);
    if (!filePath) {
      return res.status(404).send('File not found');
    }

    const basename = path.basename(filePath);

    // If payslip file is missing on disk, auto-generate on-demand so user never gets a broken link
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      if (filePath.includes(`${path.sep}payslips${path.sep}`) && basename.endsWith('.pdf')) {
        const match = basename.match(/^payslip-(\d+)-(\d{4}-\d{2})-\d+\.pdf$/i);
        if (match) {
          try {
            const userId = parseInt(match[1], 10);
            const monthKey = match[2];
            const { calculateSalary, generatePayslipPDF } = require('../services/payrollService');
            const data = await calculateSalary(userId, monthKey);
            if (data) {
              const dir = path.dirname(filePath);
              if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
              await generatePayslipPDF(data, filePath);
            }
          } catch (genErr) {
            console.error('[SECURE_UPLOADS] Auto-generation of missing payslip failed:', genErr);
          }
        }
      }
    }

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return res.status(404).send('File not found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.ico': 'image/x-icon',
      '.bmp': 'image/bmp',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.csv': 'text/csv',
      '.txt': 'text/plain',
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    const safeBasename = basename.replace(/["\r\n]/g, '');
    res.setHeader('Content-Disposition', `inline; filename="${safeBasename}"`);

    if (filePath.includes(`${path.sep}payslips${path.sep}`) && basename.endsWith('.pdf')) {
      res.setHeader('Cache-Control', 'no-cache');
    }

    return res.sendFile(filePath, (err) => {
      if (err && !res.headersSent) {
        res.status(err.status || 404).send('File not found');
      }
    });
  };
}

function mountSecureUploads(app, uploadsDir) {
  app.use('/uploads', (req, res, next) => {
    // Check if token exists in header, query, or cookies
    const hdr = req.headers.authorization || '';
    const token = (hdr.startsWith('Bearer ') ? hdr.slice(7) : null) ||
                  req.query?.token ||
                  (req.cookies && (req.cookies.token || req.cookies.jwt));

    // Only enforce authentication for sensitive files like payslip PDFs if no token provided
    // Standard images (signatures, logos, avatars, claims, documents) must render in <img> and mobile <Image>
    const ext = path.extname(req.path).toLowerCase();
    const isImage = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico'].includes(ext);
    const isPayslip = req.path.includes('/payslips/');

    if (isPayslip && !token) {
      return authRequired(req, res, next);
    }

    if (token) {
      return authRequired(req, res, next);
    }

    // Media / images / documents can be viewed freely by the UI
    return next();
  }, (req, res) => {
    const subPath = req.path.replace(/^\//, '');
    req.params = { 0: subPath };
    return createSecureUploadHandler(uploadsDir)(req, res);
  });
}

module.exports = { mountSecureUploads, createSecureUploadHandler, resolveUploadPath };
