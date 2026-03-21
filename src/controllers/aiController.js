const { OpenAI } = require('openai');
const { sequelize } = require('../models');
const { Op } = require('sequelize');
const dayjs = require('dayjs');
const aiProvider = require('../services/aiProvider');
const { 
  User, 
  StaffProfile, 
  Attendance, 
  Activity, 
  Meeting, 
  Ticket, 
  ReliabilityScore,
  SalaryForecast,
  AIAnomaly,
  SalaryTemplate
} = require('../models');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const tools = [
  {
    type: 'function',
    function: {
      name: 'get_company_holidays',
      description: 'Get the list of upcoming or past company holidays.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_leave_status',
      description: 'Get the user\'s leave balance and recent leave request history.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_attendance_records',
      description: 'Get attendance details like check-in/out times, working hours, and late marks for a specific date range.',
      parameters: {
        type: 'object',
        properties: {
          startDate: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
          endDate: { type: 'string', description: 'End date in YYYY-MM-DD format' },
        },
        required: ['startDate', 'endDate'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_user_shift_info',
      description: 'Get the assigned shift details for the user, including start time, end time, half-day threshold, and overtime rules.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_salary_and_overtime',
      description: 'Get salary estimates, detailed earnings, deductions (PF, ESI, Tax), and links to recent payslips.',
      parameters: {
        type: 'object',
        properties: {
          month: { type: 'string', description: 'Month in YYYY-MM format (e.g., 2024-03)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_user_salary_template',
      description: 'Get the salary template rules for the user to understand how salary, PF, ESI, and other components are calculated.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_tasks_summary',
      description: 'Get a summary of activities, meetings, and tickets assigned to the user.',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['activity', 'meeting', 'ticket', 'all'], default: 'all' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_sales_performance',
      description: 'Get sales metrics including visits, orders, and targets.',
      parameters: {
        type: 'object',
        properties: {
          period: { type: 'string', enum: ['daily', 'weekly', 'monthly'], default: 'monthly' },
        },
      },
    },
  },
];

async function handleToolCall(toolCall, userId, orgAccountId) {
  const models = require('../models');
  const { name, arguments: argsString } = toolCall.function;
  const args = JSON.parse(argsString);

  switch (name) {
    case 'get_company_holidays': {
      const holidays = await models.HolidayDate.findAll({
        include: [{
          model: models.HolidayTemplate,
          as: 'template',
          where: { orgAccountId },
          attributes: []
        }],
        order: [['date', 'ASC']],
      });
      return JSON.stringify(holidays);
    }

    case 'get_leave_status': {
      const balances = await models.LeaveBalance.findAll({ where: { userId } });
      const requests = await models.LeaveRequest.findAll({ 
        where: { userId },
        limit: 5,
        order: [['createdAt', 'DESC']]
      });
      
      const formattedRequests = requests.map(r => ({
        ...r.toJSON(),
        startDate: dayjs(r.startDate).format('DD MMM YYYY'),
        endDate: dayjs(r.endDate).format('DD MMM YYYY'),
        createdAt: dayjs(r.createdAt).utcOffset(330).format('DD MMM YYYY hh:mm A')
      }));

      return JSON.stringify({ balances, recentRequests: formattedRequests });
    }

    case 'get_attendance_records': {
      const records = await models.Attendance.findAll({
        where: {
          userId,
          date: { [Op.between]: [args.startDate, args.endDate] }
        },
        order: [['date', 'ASC']]
      });

      // Format times to IST (UTC+5:30)
      const formatted = records.map(r => ({
        ...r.toJSON(),
        date: r.date,
        punchedInAt: r.punchedInAt ? dayjs(r.punchedInAt).utcOffset(330).format('hh:mm A') : null,
        punchedOutAt: r.punchedOutAt ? dayjs(r.punchedOutAt).utcOffset(330).format('hh:mm A') : null,
        totalWorkHours: r.totalWorkHours,
        status: r.status,
        breakTotalSeconds: r.breakTotalSeconds,
        overtimeMinutes: r.overtimeMinutes
      }));

      return JSON.stringify(formatted);
    }

    case 'get_user_shift_info': {
      const user = await models.User.findByPk(userId, {
        include: [{ model: models.ShiftTemplate, as: 'shiftTemplate' }]
      });
      return JSON.stringify(user?.shiftTemplate || { message: 'No shift assigned' });
    }

    case 'get_salary_and_overtime': {
      const month = args.month || dayjs().format('YYYY-MM');
      const lines = await models.PayrollLine.findAll({
        where: { userId },
        limit: 3,
        order: [['createdAt', 'DESC']]
      });

      const processedLines = lines.map(line => {
        let path = line.payslipPath || '';
        if (path && !path.startsWith('/')) path = '/' + path;
        return {
          ...line.toJSON(),
          payslipLink: path ? `https://backend.vetansutra.com${path}` : null
        };
      });

      const assignment = await models.StaffSalaryAssignment.findOne({ where: { userId } });
      return JSON.stringify({ recentPayroll: processedLines, salarySetup: assignment });
    }

    case 'get_user_salary_template': {
      const user = await models.User.findByPk(userId, {
        include: [{ model: models.SalaryTemplate, as: 'salaryTemplate' }]
      });
      return JSON.stringify(user?.salaryTemplate || { message: 'No salary template assigned' });
    }

    case 'get_tasks_summary': {
      let results = {};
      if (args.type === 'all' || args.type === 'activity') {
        results.activities = await models.Activity.count({ where: { userId, status: { [Op.ne]: 'closed' } } });
      }
      if (args.type === 'all' || args.type === 'meeting') {
        results.meetings = await models.Meeting.count({ where: { createdBy: userId } });
      }
      if (args.type === 'all' || args.type === 'ticket') {
        results.tickets = await models.Ticket.count({ where: { allocatedTo: userId, status: { [Op.ne]: 'closed' } } });
      }
      return JSON.stringify(results);
    }

    case 'get_sales_performance': {
      const visits = await models.SalesVisit.count({ where: { userId } });
      const orders = await models.Order.findAll({ where: { userId }, limit: 5 });
      const jobs = await models.AssignedJob.count({ where: { staffUserId: userId, status: 'pending' } });
      const targets = await models.SalesTarget.findAll({ where: { staffUserId: userId } });
      return JSON.stringify({ visitsCount: visits, recentOrders: orders, pendingJobs: jobs, targets });
    }

    default:
      return 'Unknown function';
  }
}

exports.askAI = async (req, res) => {
  try {
    const { messages } = req.body;
    const userId = req.user.id;
    const orgAccountId = req.user.orgAccountId;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, message: 'Messages array is required' });
    }

    const systemMessage = {
      role: 'system',
      content: `You are an AI Assistant for "VetanSutra", an ERM and Attendance platform. 
      The current date is ${dayjs().format('YYYY-MM-DD')} (${dayjs().format('dddd')}).
      You help employees with their attendance, leaves, tasks, and sales queries.
      
      TIMEZONE GUIDELINES:
      - All timestamps provided by tools (punchedInAt, punchedOutAt, createdAt) are already formatted in Indian Standard Time (IST, UTC+5:30).
      - Report these times exactly as provided. Do NOT attempt to convert them.
      - If a time is "11:00 AM", it means 11:00 AM in the user's local time.

      DETAILED SALARY GUIDELINES:
      1. When asked about salary, deductions, or taxes:
         - Use "get_salary_and_overtime" to see the latest payroll records.
         - Look into the "earnings", "incentives", "deductions", and "totals" JSON fields.
         - Identify specific deductions like "Provident Fund" (PF), "ESI", "Professional Tax" (PT), or "Income Tax".
         - Explain why there is a difference between months by comparing the last few payroll entries (if provided).
         - Use "get_user_salary_template" to explain the RULES for these calculations (percentages, fixed amounts).
      2. Format payslip links as [Download Payslip](https://backend.vetansutra.com/uploads/...).
      3. For shifts, use "get_user_shift_info" and explain start/end times and half-day thresholds.
      4. Always be professional, clear, and use Hinglish if appropriate.
      5. Provide breakdowns in a readable table or bullet points if many items are present.
      6. For attendance queries, use the 'status' and 'totalWorkHours' from the record to explain if the user was Present, Late, or on Half-day.`
    };

    const apiMessages = [systemMessage, ...messages];

    let response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: apiMessages,
      tools,
      tool_choice: 'auto',
    });

    let responseMessage = response.choices[0].message;

    if (responseMessage.tool_calls) {
      apiMessages.push(responseMessage);

      for (const toolCall of responseMessage.tool_calls) {
        const toolResult = await handleToolCall(toolCall, userId, orgAccountId);
        apiMessages.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name: toolCall.function.name,
          content: toolResult,
        });
      }

      response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: apiMessages,
      });
      responseMessage = response.choices[0].message;
    }

    res.json({
      success: true,
      message: responseMessage.content,
    });

  } catch (error) {
    console.error('AI Error:', error);
    res.status(500).json({ success: false, message: 'AI Assistant is currently unavailable.' });
  }
};

exports.getAttendanceProductivity = async (req, res) => {
  try {
    const orgAccountId = req.user.orgAccountId;
    const month = parseInt(req.query.month) || dayjs().get('month') + 1;
    const year = parseInt(req.query.year) || dayjs().get('year');

    const startDate = dayjs(`${year}-${month}-01`).startOf('month').format('YYYY-MM-DD');
    const endDate = dayjs(`${year}-${month}-01`).endOf('month').format('YYYY-MM-DD');

    // 1. Fetch scores from DB
    let scores = await ReliabilityScore.findAll({
      where: { month, year },
      include: [{
        model: User, as: 'user', where: { orgAccountId }, required: true,
        include: [{ model: StaffProfile, as: 'profile' }]
      }],
      order: [['score', 'DESC']]
    });

    // 2. If no scores, or refresh requested, calculate them
    if (scores.length === 0) {
      const users = await User.findAll({ 
        where: { orgAccountId, role: 'staff' },
        include: [{ model: StaffProfile, as: 'profile' }]
      });

      if (users.length > 0) {
        // Gathering stats for AI scoring
        const stats = await Promise.all(users.map(async (u) => {
          const [presentDays, totalTasks, completedTasks] = await Promise.all([
            Attendance.count({ where: { userId: u.id, date: { [Op.between]: [startDate, endDate] }, status: { [Op.ne]: 'Absent' } } }),
            Activity.count({ where: { userId: u.id, date: { [Op.between]: [startDate, endDate] } } }),
            Activity.count({ where: { userId: u.id, date: { [Op.between]: [startDate, endDate] }, status: 'CLOSED' } })
          ]);
          return { id: u.id, name: u.profile?.name || u.phone, presentDays, totalTasks, completedTasks };
        }));

        // Call AI to score
        const aiItems = await aiProvider.scoreReliability({ month, year, users: stats });
        
        if (aiItems && Array.isArray(aiItems)) {
          // Save to DB
          await Promise.all(aiItems.map(async (item) => {
            await ReliabilityScore.upsert({
              userId: item.userId,
              month,
              year,
              score: item.score,
              breakdown: item.breakdown
            });
          }));

          // Re-fetch to get associations
          scores = await ReliabilityScore.findAll({
            where: { month, year },
            include: [{
              model: User, as: 'user', where: { orgAccountId }, required: true,
              include: [{ model: StaffProfile, as: 'profile' }]
            }],
            order: [['score', 'DESC']]
          });
        }
      }
    }

    // 3. Format for frontend
    const formattedScores = await Promise.all(scores.map(async (s) => {
      // Detailed metrics for the table
      const [presentDays, totalTasks, completedTasks] = await Promise.all([
        Attendance.count({ where: { userId: s.userId, date: { [Op.between]: [startDate, endDate] }, status: { [Op.ne]: 'Absent' } } }),
        Activity.count({ where: { userId: s.userId, date: { [Op.between]: [startDate, endDate] } } }),
        Activity.count({ where: { userId: s.userId, date: { [Op.between]: [startDate, endDate] }, status: 'CLOSED' } })
      ]);

      return {
        userId: s.userId,
        userName: s.user?.profile?.name || s.user?.phone,
        designation: s.user?.profile?.designation || 'Staff',
        score: Math.round(parseFloat(s.score)),
        breakdown: s.breakdown || { attendanceConsistency: 0, punctuality: 0, taskCompletion: 0, operationalForms: 0 },
        metrics: {
          presentDays,
          totalTasks,
          completedTasks,
          totalOps: 0,
          completedOps: 0
        }
      };
    }));

    // 4. Get Top 10
    const top10 = formattedScores.slice(0, 10);

    // 5. Get AI Summary
    const stats = {
      currentAvg: formattedScores.length ? Math.round(formattedScores.reduce((a, b) => a + b.score, 0) / formattedScores.length) : 0,
      lastMonthAvg: 75, // Placeholder
      needyCount: formattedScores.filter(s => s.score < 50).length,
      topPerformer: top10[0] ? { name: top10[0].userName, score: top10[0].score } : null
    };

    const insight = await aiProvider.getTopPerformersInsight({
      month, year,
      topPerformers: top10,
      stats
    });

    res.json({
      success: true,
      scores: formattedScores,
      top10,
      aiSummary: insight?.summary || "Team performance analysis is complete.",
      bullets: insight?.bullets || [],
      month,
      year
    });

  } catch (error) {
    console.error('Attendance Productivity Error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate productivity report' });
  }
};

exports.getSalaryForecast = async (req, res) => {
  try {
    const orgAccountId = req.user.orgAccountId;
    const month = parseInt(req.query.month) || (dayjs().get('month') + 1);
    const year = parseInt(req.query.year) || dayjs().get('year');

    // 1. Fetch SalaryForecast rows
    let forecasts = await SalaryForecast.findAll({
      where: { month, year },
      include: [{
        model: User, as: 'user', where: { orgAccountId }, required: true,
        include: [{ model: StaffProfile, as: 'profile' }]
      }],
      order: [['forecastNetPay', 'DESC']]
    });

    // 2. Fetch Risk Signals (AIAnomaly)
    let riskDetections = await AIAnomaly.findAll({
      where: { month, year, orgAccountId, type: 'risk_signal' },
      include: [{ 
        model: User, as: 'user', 
        include: [{ model: StaffProfile, as: 'profile' }] 
      }]
    });

    // 3. Trigger initial compute if empty
    if (forecasts.length === 0) {
      // Background compute (internal call)
      await exports.computeSalaryForecast({ 
        user: { orgAccountId }, 
        body: { month, year } 
      }, { json: () => {} });
      
      // Re-fetch
      forecasts = await SalaryForecast.findAll({
        where: { month, year },
        include: [{
          model: User, as: 'user', where: { orgAccountId }, required: true,
          include: [{ model: StaffProfile, as: 'profile' }]
        }]
      });
      riskDetections = await AIAnomaly.findAll({
        where: { month, year, orgAccountId, type: 'risk_signal' },
        include: [{ model: User, as: 'user', include: [{ model: StaffProfile, as: 'profile' }] }]
      });
    }

    // 4. Format forecasts for frontend
    const formattedForecasts = forecasts.map(f => ({
      userId: f.userId,
      userName: f.user?.profile?.name || f.user?.phone,
      designation: f.user?.profile?.designation || 'Staff',
      baseSalary: parseFloat(f.assumptions?.baseSalary || 20000),
      forecastNetPay: parseFloat(f.forecastNetPay),
      attendance: f.assumptions?.attendance || { present: 0, absent: 0, lateCount: 0 },
      assumptions: f.assumptions || {},
      salaryNotConfigured: !f.assumptions?.salaryConfigured
    }));

    // 5. Format risk detections
    const formattedRisks = riskDetections.map(r => ({
      userId: r.userId,
      userName: r.user?.profile?.name || r.user?.phone,
      severity: r.severity,
      message: r.message,
      categories: r.categories || [],
      attendanceRate: r.details?.attendanceRate || 0,
      absentDays: r.details?.absentDays || 0,
      taskStats: r.details?.taskStats || { totalTasks: 0, delayedTasks: 0 }
    }));

    // 6. Calculate summary
    const totalBaseSalary = formattedForecasts.reduce((sum, f) => sum + f.baseSalary, 0);
    const totalForecastedPay = formattedForecasts.reduce((sum, f) => sum + f.forecastNetPay, 0);
    
    const summary = {
      totalBaseSalary,
      totalForecastedPay,
      totalStaff: formattedForecasts.length,
      insights: [
        { title: 'Projected Savings', desc: `₹${(totalBaseSalary - totalForecastedPay).toLocaleString()} saved due to absenteeism and late penalties.`, type: 'success' },
        { title: 'At Risk Staff', desc: `${formattedRisks.filter(r => r.severity === 'high').length} staff members showing high risk patterns.`, type: 'warning' },
        { title: 'Capacity Alert', desc: "Current payroll is at 92% of target budget for the quarter.", type: 'info' }
      ],
      riskDetections: formattedRisks,
      nextMonth: {
        monthLabel: dayjs(`${year}-${month}-01`).add(1, 'month').format('MMMM'),
        amount: Math.round(totalBaseSalary * 1.05),
        rationale: "Includes projected overtime and 2 confirmed hiring requests for next month.",
        breakdown: { 
          basePay: totalBaseSalary, 
          expectedOvertime: Math.round(totalBaseSalary * 0.03),
          newHiringSalary: Math.round(totalBaseSalary * 0.04),
          expectedDeductions: Math.round(totalBaseSalary * 0.02)
        }
      }
    };

    return res.json({
      success: true,
      forecasts: formattedForecasts,
      summary,
      month,
      year
    });

  } catch (error) {
    console.error('Salary Forecast Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load salary forecasts' });
  }
};

exports.computeSalaryForecast = async (req, res) => {
  try {
    const orgAccountId = req.user.orgAccountId;
    const month = parseInt(req.body?.month) || (dayjs().get('month') + 1);
    const year = parseInt(req.body?.year) || dayjs().get('year');

    const startDate = dayjs(`${year}-${month}-01`).startOf('month').format('YYYY-MM-DD');
    const endDate = dayjs(`${year}-${month}-01`).endOf('month').format('YYYY-MM-DD');

    const users = await User.findAll({ 
      where: { orgAccountId, role: 'staff' },
      include: [
        { model: StaffProfile, as: 'profile' },
        { model: SalaryTemplate, as: 'salaryTemplate' }
      ]
    });

    if (users.length === 0) {
      return res.status(200).json({ success: true, count: 0 });
    }

    // 1. Gather stats for all users
    const stats = await Promise.all(users.map(async (u) => {
      const [present, absent, halfDay, lateCount, totalTasks, closedTasks] = await Promise.all([
        Attendance.count({ where: { userId: u.id, date: { [Op.between]: [startDate, endDate] }, status: 'Present' } }),
        Attendance.count({ where: { userId: u.id, date: { [Op.between]: [startDate, endDate] }, status: 'Absent' } }),
        Attendance.count({ where: { userId: u.id, date: { [Op.between]: [startDate, endDate] }, status: 'Half Day' } }),
        Attendance.count({ where: { userId: u.id, date: { [Op.between]: [startDate, endDate] }, late: true } }),
        Activity.count({ where: { userId: u.id, date: { [Op.between]: [startDate, endDate] } } }),
        Activity.count({ where: { userId: u.id, date: { [Op.between]: [startDate, endDate] }, status: 'CLOSED' } })
      ]);

      const baseSalary = parseFloat(u.salaryTemplate?.baseSalary || 20000);
      return {
        id: u.id,
        name: u.profile?.name || u.phone,
        baseSalary,
        salaryConfigured: !!u.salaryTemplate,
        attendance: { present, absent, halfDay, lateCount },
        tasks: { total: totalTasks, closed: closedTasks },
        monthContext: {
          todayDate: dayjs().format('YYYY-MM-DD'),
          dayOfMonth: dayjs().date(),
          totalDaysInMonth: dayjs(`${year}-${month}-01`).daysInMonth()
        }
      };
    }));

    // 2. Call AI for Forecasting
    const aiForecasts = await aiProvider.forecastSalary({ month, year, users: stats });
    
    if (aiForecasts && Array.isArray(aiForecasts)) {
      await Promise.all(aiForecasts.map(async (f) => {
        const staffStats = stats.find(s => s.id === Number(f.userId));
        await SalaryForecast.upsert({
          userId: Number(f.userId),
          month,
          year,
          forecastNetPay: f.forecastNetPay,
          assumptions: {
            ...f.assumptions,
            baseSalary: staffStats?.baseSalary,
            salaryConfigured: staffStats?.salaryConfigured,
            attendance: staffStats?.attendance
          }
        });
      }));
    }

    // 3. Call AI for Risk Detection
    const aiRisks = await aiProvider.detectRiskSignals({ month, year, users: stats });
    
    if (aiRisks && Array.isArray(aiRisks)) {
      // Clear old risks for this month/year first
      await AIAnomaly.destroy({ where: { month, year, orgAccountId, type: 'risk_signal' } });
      
      await Promise.all(aiRisks.map(async (r) => {
        const staffStats = stats.find(s => s.id === Number(r.userId));
        await AIAnomaly.create({
          userId: Number(r.userId),
          orgAccountId,
          month,
          year,
          type: 'risk_signal',
          severity: r.severity,
          message: r.message,
          categories: r.categories,
          details: {
            attendanceRate: staffStats ? Math.round((staffStats.attendance.present / 26) * 100) : 0,
            absentDays: staffStats?.attendance.absent || 0,
            taskStats: {
              totalTasks: staffStats?.tasks.total || 0,
              delayedTasks: (staffStats?.tasks.total || 0) - (staffStats?.tasks.closed || 0)
            }
          }
        });
      }));
    }

    return res.status(200).json({ success: true, count: users.length });
  } catch (error) {
    console.error('Compute Forecast Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to compute forecast' });
  }
};
