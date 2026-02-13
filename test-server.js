const express = require('express');
const { Plan } = require('./src/models');

const app = express();
app.use(express.json());

// Test endpoint without authentication
app.get('/test-plans', async (req, res) => {
  try {
    const rows = await Plan.findAll({ order: [['name', 'ASC']] });
    return res.json({ success: true, plans: rows });
  } catch (e) {
    console.error('Error:', e);
    return res.status(500).json({ success: false, message: 'Failed to load plans', error: e.message });
  }
});

const port = 4001;
app.listen(port, () => {
  console.log(`Test server running on http://localhost:${port}`);
  console.log('Test with: curl http://localhost:4001/test-plans');
});
