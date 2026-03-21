const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authRequired } = require('../middleware/auth');

router.use(authRequired);

router.post('/ask', aiController.askAI);

module.exports = router;
