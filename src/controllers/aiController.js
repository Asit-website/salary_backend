const { OpenAI } = require('openai');
const { sequelize } = require('../models');
const { Op } = require('sequelize');
const dayjs = require('dayjs');

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
