const path = require('path');
const fs = require('fs');
const { authRequired } = require('./auth');

function resolveUploadPath(requestPath, uploadsDir) {
  const normalized = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, '');
  const fullPath = path.resolve(uploadsDir, normalized);
  const root = path.resolve(uploadsDir);
  if (!fullPath.startsWith(root + path.sep) && fullPath !== root) {
    return null;
  }
  return fullPath;
}

function createSecureUploadHandler(uploadsDir) {
  return (req, res) => {
    const subPath = req.params[0] || '';
    const filePath = resolveUploadPath(subPath, uploadsDir);
    if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return res.status(404).send('File not found');
    }

    const basename = path.basename(filePath);
    if (filePath.includes(`${path.sep}payslips${path.sep}`) && basename.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${basename}"`);
      res.setHeader('Cache-Control', 'no-cache');
    }

    return fs.createReadStream(filePath).pipe(res);
  };
}

function mountSecureUploads(app, uploadsDir) {
  app.use('/uploads', authRequired, (req, res) => {
    const subPath = req.path.replace(/^\//, '');
    req.params = { 0: subPath };
    return createSecureUploadHandler(uploadsDir)(req, res);
  });
}

module.exports = { mountSecureUploads, createSecureUploadHandler, resolveUploadPath };
