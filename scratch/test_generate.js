const axios = require('axios');

async function testGenerate() {
  try {
    const res = await axios.post('http://localhost:4000/admin/payroll/generate-payslip', {
      userId: 1, // Assume user 1 exists
      monthKey: '2026-04'
    }, {
      headers: {
        // Need a token, but I'll check if I can bypass for local test or if I need to find one
        'Authorization': 'Bearer ...' 
      }
    });
    console.log(res.data);
  } catch (e) {
    console.error(e.response ? e.response.data : e.message);
  }
}

// testGenerate();
