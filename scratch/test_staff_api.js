const axios = require('axios');
const path = require('path');
require('dotenv').config();

async function testApi() {
  try {
    const { User } = require('../src/models');
    const jwt = require('jsonwebtoken');
    const admin = await User.findOne({ where: { role: 'superadmin' } });
    
    if (!admin) {
      console.log('No superadmin found');
      return;
    }
    
    const token = jwt.sign(
      { id: admin.id, role: admin.role, phone: admin.phone },
      process.env.JWT_SECRET || 'dev_secret_change_me',
      { expiresIn: '1h' }
    );
    
    const res = await axios.get('http://localhost:4000/superadmin/staff', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('API Response:', JSON.stringify(res.data, null, 2));
    process.exit(0);
  } catch (e) {
    console.error('API Test failed:', e.response?.data || e.message);
    process.exit(1);
  }
}

testApi();
