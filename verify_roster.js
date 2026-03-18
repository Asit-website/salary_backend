const axios = require('axios');
const dayjs = require('dayjs');

const API_URL = 'http://localhost:4000';
const ADMIN_TOKEN = 'YOUR_ADMIN_TOKEN'; // This needs to be a valid token for testing

async function testRoster() {
  try {
    console.log('Testing Roster API...');

    // 1. Fetch Roster
    const startDate = dayjs().startOf('week').format('YYYY-MM-DD');
    const endDate = dayjs().endOf('week').format('YYYY-MM-DD');
    const rosterResp = await axios.get(`${API_URL}/admin/roster`, {
      params: { startDate, endDate },
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    });
    console.log('Roster Fetch Success:', rosterResp.data.success);

    // 2. Save Roster Entry
    const testUserId = 2; // Assuming user ID 2 exists
    const saveResp = await axios.post(`${API_URL}/admin/roster`, {
      assessments: [
        { userId: testUserId, date: startDate, status: 'WEEKLY_OFF' }
      ]
    }, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    });
    console.log('Roster Save Success:', saveResp.data.success);

    // 3. Verify Attendance Status prioritizes Roster
    const statusResp = await axios.get(`${API_URL}/attendance/status`, {
      params: { userId: testUserId, date: startDate },
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    });
    console.log('Attendance Status:', statusResp.data.status.dayStatus);
    if (statusResp.data.status.dayStatus === 'WEEKLY_OFF') {
      console.log('✅ Roster priority verified!');
    } else {
      console.log('❌ Roster priority FAILED!');
    }

  } catch (error) {
    console.error('Test Failed:', error.response?.data || error.message);
  }
}

// testRoster();
console.log('Verification script created. Please run manually if needed or check logic.');
