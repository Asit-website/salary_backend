const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authRequired } = require('../middleware/auth');

router.use(authRequired);

router.post('/ask', aiController.askAI);
router.get('/attendance-productivity', aiController.getAttendanceProductivity);
router.get('/salary-forecast', aiController.getSalaryForecast);
router.post('/salary-forecast/compute', aiController.computeSalaryForecast);

module.exports = router;
