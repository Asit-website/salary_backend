const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/ping', (req, res) => {
  res.json({ success: true, message: 'Tally Bridge Agent is running' });
});

app.get('/tally/status', async (req, res) => {
  const tallyUrl = req.query.url || 'http://localhost:9000';
  try {
    // Send a simple ping to Tally Prime
    const response = await axios.post(tallyUrl, '', {
      headers: { 'Content-Type': 'text/xml' },
      timeout: 2000
    });
    res.json({ success: true, message: 'Connected to Tally Prime' });
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      res.json({ success: false, message: `Could not connect to Tally Prime: connection refused on ${tallyUrl}. Please ensure Tally Prime ODBC/HTTP server is enabled.` });
    } else {
      // Sometimes it responds with 400 or other errors on empty posts, but still means it's running!
      res.json({ success: true, message: 'Connected to Tally Prime (responded with status)' });
    }
  }
});

app.post('/tally/push', async (req, res) => {
  const { xml, tallyUrl } = req.body;
  if (!xml) {
    return res.status(400).json({ success: false, error: 'XML content is required' });
  }
  const url = tallyUrl || 'http://localhost:9000';
  try {
    const response = await axios.post(url, xml, {
      headers: { 'Content-Type': 'text/xml' },
      timeout: 10000
    });
    
    const responseData = response.data;
    console.log('Tally Response:', responseData);
    
    // Check for errors in Tally XML response
    if (responseData.includes('<LINEERROR>') || responseData.includes('LINEERROR')) {
      const match = responseData.match(/<LINEERROR>([^<]+)<\/LINEERROR>/);
      const errorMsg = match ? match[1] : 'Error importing data into Tally';
      return res.json({ success: false, error: errorMsg, rawResponse: responseData });
    }
    
    if (responseData.includes('<ERRORS>') || responseData.includes('ERRORS')) {
      const errorsMatch = responseData.match(/<ERRORS>([^<]+)<\/ERRORS>/);
      const errorsCount = errorsMatch ? parseInt(errorsMatch[1]) : 0;
      if (errorsCount > 0) {
        return res.json({ success: false, error: `Tally reported ${errorsCount} error(s) during import.`, rawResponse: responseData });
      }
    }

    res.json({ success: true, message: 'Voucher pushed to Tally successfully', rawResponse: responseData });
  } catch (error) {
    console.error('Error forwarding to Tally:', error.message);
    res.json({ success: false, error: `Tally communication failed: ${error.message}` });
  }
});

const PORT = process.env.PORT || 7000;
app.listen(PORT, () => {
  console.log(`Tally Bridge Agent running on port ${PORT}`);
});
