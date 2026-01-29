/* AI Provider abstraction for anomaly analysis, reliability scoring, and salary forecasting.
   Uses OpenAI via REST if OPENAI_API_KEY is present; otherwise returns null to signal fallback.
*/

try { require('dotenv').config(); } catch (_) { /* optional */ }

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

function isAIEnabled() {
  return !!OPENAI_API_KEY;
}

async function callOpenAIJSON(prompt, schemaNote) {
  if (!OPENAI_API_KEY) return null;
  const body = {
    model: OPENAI_MODEL,
    messages: [
      { role: 'system', content: 'You are a backend analysis service. Always return strict JSON only.' },
      { role: 'user', content: `${prompt}\n\nReturn ONLY valid JSON. ${schemaNote || ''}` }
    ],
    temperature: 0.1,
    response_format: { type: 'json_object' }
  };
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch (_) {
    return null;
  }
}

// Analyze anomalies for a given date; inputs is an array of attendance rows (subset fields used)
async function analyzeAnomalies({ date, attendance }) {
  if (!isAIEnabled()) return null;
  const simplified = attendance.map(a => ({
    id: a.id, userId: a.userId, ts: a.createdAt, lat: a.lat, lng: a.lng, type: a.type || a.status || null
  }));
  const prompt = `Given attendance events for date ${date}, detect suspicious anomalies like repeated same-location check-ins in short time, unrealistic travel speeds, device reuse patterns. Output an array anomalies with fields: userId, date, type (string key), severity (low|medium|high), details (object with ids/rationale). Here are the events in JSON: ${JSON.stringify(simplified).slice(0, 120000)}`;
  const schemaNote = 'Schema: { anomalies: Array<{ userId:number, date:string, type:string, severity:string, details:object }> }';
  const out = await callOpenAIJSON(prompt, schemaNote);
  if (!out || !Array.isArray(out.anomalies)) return null;
  return out.anomalies;
}

// Score reliability for a month; inputs minimal
async function scoreReliability({ month, year, users }) {
  if (!isAIEnabled()) return null;
  const simplified = users.map(u => ({ id: u.id, phone: u.phone }));
  const prompt = `Assign a reliability score (60-100) to each user id with a breakdown weights of attendanceConsistency, punctuality, tasks, locationAccuracy. Return items = [{ userId, score, breakdown }] for month ${month}-${year}. Users: ${JSON.stringify(simplified).slice(0, 120000)}`;
  const schemaNote = 'Schema: { items: Array<{ userId:number, score:number, breakdown:{attendanceConsistency:number,punctuality:number,tasks:number,locationAccuracy:number}}>}';
  const out = await callOpenAIJSON(prompt, schemaNote);
  if (!out || !Array.isArray(out.items)) return null;
  return out.items;
}

// Forecast salary for a month; inputs minimal
async function forecastSalary({ month, year, users }) {
  if (!isAIEnabled()) return null;
  const simplified = users.map(u => ({ id: u.id }));
  const prompt = `For each user id, forecast net pay for ${month}-${year} with basic assumptions. Base around 20000 with reasonable variance. Return items = [{ userId, forecastNetPay, assumptions }]`;
  const schemaNote = 'Schema: { items: Array<{ userId:number, forecastNetPay:number, assumptions:object }>] }';
  const out = await callOpenAIJSON(prompt, schemaNote);
  if (!out || !Array.isArray(out.items)) return null;
  return out.items;
}

module.exports = { isAIEnabled, analyzeAnomalies, scoreReliability, forecastSalary };
