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

  // Extract today's date from the first user's monthContext if available
  const todayDate = users[0]?.monthContext?.todayDate || `${year}-${String(month).padStart(2,'0')}-01`;
  const dayOfMonth = users[0]?.monthContext?.dayOfMonth || 1;
  const totalDaysInMonth = users[0]?.monthContext?.totalDaysInMonth || 31;

  const prompt = `You are a Senior HR Payroll Expert. Today is ${todayDate}. The month is ${month}-${year} with ${totalDaysInMonth} total days. ${dayOfMonth - 1} days have fully elapsed (up to yesterday).

  For each staff member, forecast their FINAL net pay for the FULL month.

  CALCULATION METHOD (MUST follow exactly):
  1. "payableUnits" = attendance.present + (attendance.halfDay × 0.5) + attendance.weeklyOffs + attendance.holidays + attendance.paidLeave
  2. Subtract late penalty: payableUnits = payableUnits - attendance.latePenaltyDays
  3. For remaining future days (monthContext.daysRemaining), add projected WOs (monthContext.futureWeeklyOffs) + holidays (monthContext.futureHolidays) + assume remaining working days as present.
  4. totalProjectedPayable = payableUnits + futureWeeklyOffs + futureHolidays + (daysRemaining - futureWeeklyOffs - futureHolidays)
  5. ratio = totalProjectedPayable / ${totalDaysInMonth}  (clamp between 0 and 1)
  6. forecastNetPay = Math.round(baseSalary × ratio) + overtimePay + leaveEncashmentAmount

  IMPORTANT:
  - attendance.absent shows days the staff was ABSENT. These REDUCE pay.
  - attendance.latePenaltyDays: days deducted due to late arrivals (lateCount shows how many times late).
  - leaveEncashmentAmount: approved leave encashment amount to ADD to salary (not pro-rated).
  - overtimePay: calculated overtime amount to ADD to salary (not pro-rated).
  - Do NOT give full baseSalary if absents > 0 or latePenaltyDays > 0.

  Users Data: ${JSON.stringify(users).slice(0, 120000)}
  
  Return items = [{ userId, forecastNetPay, assumptions }]
  The assumptions object needs keys: "attendanceTrend", "rosterImpact", "summary" (will be overridden server-side, but compute forecastNetPay accurately).`;

  const schemaNote = 'Schema: { items: Array<{ userId:number, forecastNetPay:number, assumptions: { attendanceTrend: string, rosterImpact: string, summary: string } }> }';
  const out = await callOpenAIJSON(prompt, schemaNote);
  if (!out || !Array.isArray(out.items)) return null;
  return out.items;
}

module.exports = { isAIEnabled, analyzeAnomalies, scoreReliability, forecastSalary, callOpenAIJSON };
