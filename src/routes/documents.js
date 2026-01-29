const express = require('express');

const { DocumentType, StaffDocument } = require('../models');
const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { upload } = require('../upload');

const router = express.Router();

router.use(authRequired);
router.use(requireRole(['staff']));

router.get('/required', async (req, res) => {
  try {
    const types = await DocumentType.findAll({ where: { active: true }, order: [['createdAt', 'ASC']] });
    const docs = await StaffDocument.findAll({ where: { userId: req.user.id } });
    const byType = new Map(docs.map((d) => [String(d.documentTypeId), d]));

    return res.json({
      success: true,
      documents: types.map((t) => {
        const existing = byType.get(String(t.id));
        return {
          id: t.id,
          key: t.key,
          name: t.name,
          required: !!t.required,
          allowedMime: t.allowedMime || null,
          uploaded: !!existing,
          status: existing?.status || null,
          fileUrl: existing?.fileUrl || null,
          updatedAt: existing?.updatedAt || null,
        };
      }),
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load documents' });
  }
});

router.post('/:documentTypeId/upload', upload.single('file'), async (req, res) => {
  try {
    const id = Number(req.params.documentTypeId);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid document type' });

    const type = await DocumentType.findOne({ where: { id, active: true } });
    if (!type) return res.status(404).json({ success: false, message: 'Document type not found' });

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File is required' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const fileName = req.file.originalname || null;

    const existing = await StaffDocument.findOne({ where: { userId: req.user.id, documentTypeId: id } });
    if (existing) {
      await existing.update({ fileUrl, fileName, status: 'SUBMITTED' });
      return res.json({ success: true, document: existing });
    }

    const created = await StaffDocument.create({
      userId: req.user.id,
      documentTypeId: id,
      fileUrl,
      fileName,
      status: 'SUBMITTED',
    });

    return res.json({ success: true, document: created });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to upload document' });
  }
});

module.exports = router;
