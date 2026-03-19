const { 
  User, 
  Attendance, 
  LeaveRequest, 
  HolidayDate, 
  StaffSalaryAssignment, 
  PayrollLine, 
  ReliabilityScore,
  StaffProfile,
  SalaryTemplate,
  ShiftTemplate,
  StaffShiftAssignment,
  AttendanceAutomationRule,
  StaffRoster,
  Activity,
  Meeting,
  MeetingAttendee,
  Ticket,
  SalesVisit,
  SalesTarget,
  Order,
  Client
} = require('../models');
const { Op } = require('sequelize');
const dayjs = require('dayjs');
const aiProvider = require('./aiProvider');

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'getAttendanceStatus',
      description: 'Get today\'s or a specific date\'s attendance summary (present, absent, late, half-day).',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Date in YYYY-MM-DD format. Defaults to today.' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getStaffOnLeave',
      description: 'Check who is on leave for a specific date or currently.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Date in YYYY-MM-DD format.' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getHolidayInfo',
      description: 'Get list of holidays for a specific month or year.',
      parameters: {
        type: 'object',
        properties: {
          month: { type: 'number', description: 'Month (1-12)' },
          year: { type: 'number', description: 'Year (e.g. 2026)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getEmployeeFinancials',
      description: 'Get salary and overtime details for a specific employee.',
      parameters: {
        type: 'object',
        properties: {
          staffName: { type: 'string', description: 'Name of the staff member' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getReliabilityScores',
      description: 'Get the latest reliability scores for the team or a specific user.',
      parameters: {
        type: 'object',
        properties: {
          staffName: { type: 'string', description: 'Optional name of the staff member' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getTotalStaffCount',
      description: 'Get the total number of staff in the current organization.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getTaskSummary',
      description: 'Get activity, meeting, or ticket summary for the organization, optionally for a date or staff member.',
      parameters: {
        type: 'object',
        properties: {
          taskType: { type: 'string', enum: ['activity', 'meeting', 'ticket'], description: 'Type of task data to summarize.' },
          date: { type: 'string', description: 'Optional date in YYYY-MM-DD format.' },
          staffName: { type: 'string', description: 'Optional staff name filter.' }
        },
        required: ['taskType']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getTaskCompletions',
      description: 'Find who completed activities, meetings, or tickets, optionally on a specific date or for a specific staff member.',
      parameters: {
        type: 'object',
        properties: {
          taskType: { type: 'string', enum: ['activity', 'meeting', 'ticket', 'all'], description: 'Task type to inspect.' },
          date: { type: 'string', description: 'Optional date in YYYY-MM-DD format.' },
          staffName: { type: 'string', description: 'Optional staff name filter.' }
        },
        required: ['taskType']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getSalesSummary',
      description: 'Get sales summary including total orders, total visits, total sales amount, conversion, and top sales staff for a date or period.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Optional date in YYYY-MM-DD format.' },
          period: { type: 'string', enum: ['daily', 'weekly', 'monthly'], description: 'Optional period filter. Defaults to daily if date is provided, otherwise monthly.' },
          staffName: { type: 'string', description: 'Optional staff name filter.' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getSalesOrders',
      description: 'Get sales orders and identify who brought each order, optionally filtered by date or staff name.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Optional date in YYYY-MM-DD format.' },
          staffName: { type: 'string', description: 'Optional staff name filter.' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getSalesVisits',
      description: 'Get sales visits and identify who visited clients, optionally filtered by date or staff name.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Optional date in YYYY-MM-DD format.' },
          staffName: { type: 'string', description: 'Optional staff name filter.' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getSalesTargetStatus',
      description: 'Check sales target completion and show who completed targets, optionally by period, date, or staff name.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Optional date in YYYY-MM-DD format.' },
          period: { type: 'string', enum: ['daily', 'weekly', 'monthly'], description: 'Target period. Defaults to monthly.' },
          staffName: { type: 'string', description: 'Optional staff name filter.' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getAllStaffNames',
      description: 'Get the names of all staff members in the organization.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  }
];

class AIChatService {
  async handleChat(orgAccountId, message, history = []) {
    if (!aiProvider.isAIEnabled()) {
      return { role: 'assistant', content: "AI is currently disabled. Please configure OPENAI_API_KEY." };
    }

    const messages = [
      { role: 'system', content: `You are an AI Admin Assistant for Thinktech Attendance System.
        You have access to real-time database tools. Always use them when the answer depends on organization data.

        RESPONSE RULES:
        1. Answer only what the user asked. Do not add introductions, conclusions, or follow-up offers.
        2. For count or total questions, reply in one short sentence.
        3. For list questions, reply in simple point format with one item per line.
        4. Use plain text only. Do not use markdown like **bold**.
        5. Never say you do not have access before using the relevant tool.
        6. If no data is found, say "Data not available."
        7. Keep replies under 3 short lines unless the user asks for more detail.

        Current Organization ID: ${orgAccountId}.
        Today's Date: ${dayjs().format('YYYY-MM-DD')}.` },
      ...history,
      { role: 'user', content: message }
    ];

    const body = {
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
      temperature: 0.2,
      max_tokens: 180
    };

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const data = await resp.json();
    const responseMessage = data.choices[0].message;

    if (responseMessage.tool_calls) {
      const toolMessages = [];
      for (const toolCall of responseMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        
        let toolResult;
        switch (functionName) {
          case 'getAttendanceStatus':
            toolResult = await this.getAttendanceStatus(orgAccountId, args.date);
            break;
          case 'getStaffOnLeave':
            toolResult = await this.getStaffOnLeave(orgAccountId, args.date);
            break;
          case 'getHolidayInfo':
            toolResult = await this.getHolidayInfo(orgAccountId, args.month, args.year);
            break;
          case 'getEmployeeFinancials':
            toolResult = await this.getEmployeeFinancials(orgAccountId, args.staffName);
            break;
          case 'getReliabilityScores':
            toolResult = await this.getReliabilityScores(orgAccountId, args.staffName);
            break;
          case 'getTotalStaffCount':
            toolResult = await this.getTotalStaffCount(orgAccountId);
            break;
          case 'getTaskSummary':
            toolResult = await this.getTaskSummary(orgAccountId, args.taskType, args.date, args.staffName);
            break;
          case 'getTaskCompletions':
            toolResult = await this.getTaskCompletions(orgAccountId, args.taskType, args.date, args.staffName);
            break;
          case 'getSalesSummary':
            toolResult = await this.getSalesSummary(orgAccountId, args.date, args.period, args.staffName);
            break;
          case 'getSalesOrders':
            toolResult = await this.getSalesOrders(orgAccountId, args.date, args.staffName);
            break;
          case 'getSalesVisits':
            toolResult = await this.getSalesVisits(orgAccountId, args.date, args.staffName);
            break;
          case 'getSalesTargetStatus':
            toolResult = await this.getSalesTargetStatus(orgAccountId, args.date, args.period, args.staffName);
            break;
          case 'getAllStaffNames':
            toolResult = await this.getAllStaffNames(orgAccountId);
            break;
          default:
            toolResult = { error: 'Unknown function' };
        }

        toolMessages.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name: functionName,
          content: JSON.stringify(toolResult)
        });
      }

      // Second call to OpenAI with tool results
      const secondResp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: body.model,
          temperature: body.temperature,
          max_tokens: body.max_tokens,
          messages: [...messages, responseMessage, ...toolMessages]
        })
      });
      const secondData = await secondResp.json();
      return this.sanitizeAssistantMessage(secondData.choices[0].message);
    }

    return this.sanitizeAssistantMessage(responseMessage);
  }

  sanitizeAssistantMessage(message) {
    if (!message || typeof message.content !== 'string') {
      return message;
    }

    const sanitizedContent = message.content
      .replace(/\s+(If you need further information or assistance, let me know\.?|If you need further information, let me know\.?|Let me know if you need anything else\.?|Please let me know if you need anything else\.?|Let me know if you need more details\.?)+\s*$/i, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return {
      ...message,
      content: sanitizedContent || 'Data not available.'
    };
  }

  async getAttendanceStatus(orgAccountId, date = dayjs().format('YYYY-MM-DD')) {
    const start = dayjs(date).startOf('day').toDate();
    const end = dayjs(date).endOf('day').toDate();

    const [attendance, allStaff, penaltyRule] = await Promise.all([
      Attendance.findAll({
        where: { date },
        include: [{ 
            model: User, as: 'user', where: { orgAccountId }, required: true,
            include: [{ model: StaffProfile, as: 'profile' }]
        }]
      }),
      User.findAll({ 
        where: { orgAccountId, role: 'staff' },
        include: [{ model: StaffProfile, as: 'profile' }]
      }),
      AttendanceAutomationRule.findOne({
        where: { key: 'late_punchin_penalty', orgAccountId, active: true }
      })
    ]);

    const totalStaff = allStaff.length;

    // Lateness logic helper (matching attendance.js logic)
    let lateTiers = [];
    if (penaltyRule) {
      let config = penaltyRule.config;
      if (typeof config === 'string') {
        try { config = JSON.parse(config); } catch (e) {
          try { config = JSON.parse(JSON.parse(config)); } catch (__) { config = {}; }
        }
      }
      lateTiers = Array.isArray(config.tiers) ? config.tiers : (config.lateMinutes ? [{ minMinutes: Number(config.lateMinutes), maxMinutes: 9999 }] : []);
    }

    const decoratedAttendance = await Promise.all(attendance.map(async (a) => {
      let isLate = false;
      let lateReason = null;

      if (a.punchedInAt) {
        // 1. Get effective shift for this user on this date
        let shiftTpl = null;
        try {
          // Check roster first
          const roster = await StaffRoster.findOne({ where: { userId: a.userId, date } });
          if (roster && roster.status === 'SHIFT' && roster.shiftTemplateId) {
            shiftTpl = await ShiftTemplate.findByPk(roster.shiftTemplateId);
          }
          if (!shiftTpl) {
            // Check assignment
            const asg = await StaffShiftAssignment.findOne({ 
              where: { 
                userId: a.userId, 
                effectiveFrom: { [Op.lte]: date },
                [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: date } }]
              },
              order: [['effectiveFrom', 'DESC']]
            });
            if (asg) {
              shiftTpl = await ShiftTemplate.findByPk(asg.shiftTemplateId);
            }
          }
          // Fallback to user default
          if (!shiftTpl && a.user?.shiftTemplateId) {
            shiftTpl = await ShiftTemplate.findByPk(a.user.shiftTemplateId);
          }
        } catch (_) {}

        if (shiftTpl?.startTime) {
          const [sh, sm, ss] = shiftTpl.startTime.split(':').map(Number);
          const shiftStartSec = sh * 3600 + sm * 60 + (ss || 0);

          const punchIn = new Date(a.punchedInAt);
          // Adjust to IST if needed (assuming DB stores UTC but we want to compare local times)
          // The attendance.js logic added 5.5 hours, let's keep it consistent
          const istDate = new Date(punchIn.getTime() + (5.5 * 3600 * 1000));
          const punchInSec = istDate.getUTCHours() * 3600 + istDate.getUTCMinutes() * 60 + istDate.getUTCSeconds();

          if (punchInSec > shiftStartSec) {
            const lateMins = Math.floor((punchInSec - shiftStartSec) / 60);
            for (const t of lateTiers) {
              if (lateMins >= Number(t.minMinutes) && lateMins <= Number(t.maxMinutes)) {
                isLate = true;
                lateReason = `Late by ${lateMins} minutes`;
                break;
              }
            }
          }
        }
      }

      return { ...a.toJSON(), isLate, lateReason };
    }));

    const presentIds = attendance.map(a => a.userId);
    const absentStaff = allStaff.filter(s => !presentIds.includes(s.id));

    const present = decoratedAttendance.filter(a => a.status !== 'absent').length;
    const late = decoratedAttendance.filter(a => a.isLate).length;
    const halfDay = decoratedAttendance.filter(a => a.status === 'half_day' || a.halfDay === true).length;
    const overtimeCount = decoratedAttendance.filter(a => (a.overtimeMinutes || 0) > 0).length;
    
    return {
      date,
      totalStaff,
      present,
      absent: totalStaff - present,
      late,
      halfDay,
      overtimeCount,
      presentStaffNames: decoratedAttendance.filter(a => a.status !== 'absent').map(a => a.user?.profile?.name || a.user?.phone),
      absentStaffNames: absentStaff.map(s => s.profile?.name || s.phone),
      latecomers: decoratedAttendance.filter(a => a.isLate).map(a => ({
        name: a.user?.profile?.name || a.user?.phone,
        reason: a.lateReason
      })),
      overtimeStaff: decoratedAttendance.filter(a => (a.overtimeMinutes || 0) > 0).map(a => ({
        name: a.user?.profile?.name || a.user?.phone,
        duration: `${Math.floor(a.overtimeMinutes / 60)}h ${a.overtimeMinutes % 60}m`
      }))
    };
  }

  async getStaffOnLeave(orgAccountId, date = dayjs().format('YYYY-MM-DD')) {
    const leaves = await LeaveRequest.findAll({
      where: {
        status: 'approved',
        startDate: { [Op.lte]: date },
        endDate: { [Op.gte]: date }
      },
      include: [{ 
          model: User, as: 'user', where: { orgAccountId }, required: true,
          include: [{ model: StaffProfile, as: 'profile' }]
      }]
    });

    return leaves.map(l => ({
      name: l.user?.profile?.name || l.user?.phone,
      type: l.leaveType,
      reason: l.reason
    }));
  }

  async getHolidayInfo(orgAccountId, month, year) {
    const where = {};
    if (year) {
      const start = dayjs(`${year}-01-01`).startOf('year').toDate();
      const end = dayjs(`${year}-01-01`).endOf('year').toDate();
      where.date = { [Op.between]: [start, end] };
    }
    if (month && year) {
        const start = dayjs(`${year}-${month}-01`).startOf('month').toDate();
        const end = dayjs(`${year}-${month}-01`).endOf('month').toDate();
        where.date = { [Op.between]: [start, end] };
    }

    const holidays = await HolidayDate.findAll({ where });
    return holidays.map(h => ({ name: h.name, date: h.date }));
  }

  async getEmployeeFinancials(orgAccountId, staffName) {
    const user = await User.findOne({
      where: { orgAccountId },
      include: [
        { 
          model: StaffProfile, 
          as: 'profile', 
          where: User.sequelize.where(
            User.sequelize.fn('LOWER', User.sequelize.col('profile.name')),
            'LIKE',
            `%${staffName.toLowerCase()}%`
          )
        },
        { 
          model: StaffSalaryAssignment, 
          as: 'salaryAssignments',
          include: [{ model: SalaryTemplate, as: 'template' }] 
        }
      ]
    });

    if (!user) return { error: 'Staff member not found' };

    // Calculate base salary
    let baseSalary = 0;
    
    // 1. Try StaffSalaryAssignment
    const activeAsg = user.salaryAssignments?.sort((a,b) => b.id - a.id)[0];
    if (activeAsg?.template) {
      const earnings = activeAsg.template.earnings || [];
      const earningsArray = typeof earnings === 'string' ? JSON.parse(earnings) : earnings;
      baseSalary = earningsArray.reduce((sum, e) => sum + (Number(e.valueNumber) || 0), 0);
    }

    // 2. Fallback to User fields (very common in this DB)
    if (!baseSalary) {
      baseSalary = Number(user.netSalary) || Number(user.totalEarnings) || 0;
    }
    
    // 3. Try to parse from salary_values JSON if exists (nested structured data)
    if (!baseSalary && user.salaryValues) {
        try {
            const vals = typeof user.salaryValues === 'string' ? JSON.parse(user.salaryValues) : user.salaryValues;
            baseSalary = Number(vals.earnings?.basic_salary) || 
                         Number(vals.basic_salary) || 
                         Number(vals.totalEarnings) || 
                         Number(vals.netSalary) || 0;
        } catch (_) {}
    }

    // 4. Fallback to basicSalary field
    if (!baseSalary) {
      baseSalary = Number(user.basicSalary) || 0;
    }

    // 5. Hard fallback: Check any field that looks like salary
    if (!baseSalary) {
      baseSalary = Number(user.grossSalary) || 0;
    }

    const overtime = await Attendance.sum('overtimeMinutes', {
        where: { userId: user.id, createdAt: { [Op.between]: [dayjs().startOf('month').toDate(), dayjs().toDate()] } }
    });

    return {
      name: user.profile?.name || user.phone,
      baseSalary: baseSalary || 'Not assigned',
      overtimeMinutesThisMonth: overtime || 0,
      overtimeHours: Math.round((overtime || 0) / 60 * 10) / 10
    };
  }

  async getReliabilityScores(orgAccountId, staffName) {
      const where = {};
      if (staffName) {
          const user = await User.findOne({
              where: { orgAccountId },
              include: [{ model: StaffProfile, as: 'profile', where: { name: { [Op.like]: `%${staffName}%` } } }]
          });
          if (user) where.userId = user.id;
      }

      const scores = await ReliabilityScore.findAll({
          where,
          limit: 10,
          order: [['createdAt', 'DESC']],
          include: [{ 
              model: User, as: 'user', where: { orgAccountId }, required: true,
              include: [{ model: StaffProfile, as: 'profile' }]
          }]
      });

      return scores.map(s => ({
          name: s.user?.profile?.name || s.user?.phone,
          score: s.score,
          month: s.month,
          year: s.year
      }));
  }

  async getTotalStaffCount(orgAccountId) {
    const totalStaff = await User.count({
      where: { orgAccountId, role: 'staff' }
    });

    return { totalStaff };
  }

  async getAllStaffNames(orgAccountId) {
    const users = await User.findAll({
      where: { orgAccountId, role: 'staff' },
      include: [{ model: StaffProfile, as: 'profile', attributes: ['name'] }]
    });

    const names = users.map(user => user.profile?.name).filter(Boolean);
    return { staffNames: names };
  }

  async findUsersByName(orgAccountId, staffName) {
    if (!staffName) return [];

    const users = await User.findAll({
      where: { orgAccountId },
      include: [{
        model: StaffProfile,
        as: 'profile',
        where: User.sequelize.where(
          User.sequelize.fn('LOWER', User.sequelize.col('profile.name')),
          'LIKE',
          `%${String(staffName).toLowerCase()}%`
        ),
        required: true
      }]
    });

    return users;
  }

  async getTaskSummary(orgAccountId, taskType, date, staffName) {
    switch (taskType) {
      case 'activity':
        return await this.getActivitySummary(orgAccountId, date, staffName);
      case 'meeting':
        return await this.getMeetingSummary(orgAccountId, date, staffName);
      case 'ticket':
        return await this.getTicketSummary(orgAccountId, date, staffName);
      case 'getAllStaffNames':
        return await this.getAllStaffNames(orgAccountId);
      default:
        return { error: 'Unsupported task type' };
    }
  }

  async getTaskCompletions(orgAccountId, taskType, date, staffName) {
    if (taskType === 'all') {
      const [activities, meetings, tickets] = await Promise.all([
        this.getActivityCompletions(orgAccountId, date, staffName),
        this.getMeetingCompletions(orgAccountId, date, staffName),
        this.getTicketCompletions(orgAccountId, date, staffName)
      ]);

      return { activities, meetings, tickets };
    }

    switch (taskType) {
      case 'activity':
        return await this.getActivityCompletions(orgAccountId, date, staffName);
      case 'meeting':
        return await this.getMeetingCompletions(orgAccountId, date, staffName);
      case 'ticket':
        return await this.getTicketCompletions(orgAccountId, date, staffName);
      default:
        return { error: 'Unsupported task type' };
    }
  }

  async getActivitySummary(orgAccountId, date, staffName) {
    const where = { orgAccountId };
    if (date) where.date = date;

    if (staffName) {
      const users = await this.findUsersByName(orgAccountId, staffName);
      if (!users.length) return { total: 0, statusCounts: {}, items: [] };
      where.userId = users.map(user => user.id);
    }

    const activities = await Activity.findAll({
      where,
      include: [{ model: User, as: 'user', include: [{ model: StaffProfile, as: 'profile' }] }],
      order: [['createdAt', 'DESC']]
    });

    const statusCounts = activities.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});

    return {
      type: 'activity',
      date: date || null,
      total: activities.length,
      statusCounts,
      closedCount: activities.filter(item => item.isClosed).length,
      items: activities.slice(0, 10).map(item => ({
        title: item.title,
        name: item.user?.profile?.name || item.user?.phone,
        status: item.status,
        date: item.date,
        remarks: item.remarks || null
      }))
    };
  }

  async getMeetingSummary(orgAccountId, date, staffName) {
    const where = { orgAccountId };
    if (date) {
      where.scheduledAt = {
        [Op.between]: [dayjs(date).startOf('day').toDate(), dayjs(date).endOf('day').toDate()]
      };
    }

    if (staffName) {
      const users = await this.findUsersByName(orgAccountId, staffName);
      if (!users.length) return { total: 0, statusCounts: {}, items: [] };
      where.createdBy = users.map(user => user.id);
    }

    const meetings = await Meeting.findAll({
      where,
      include: [
        { model: User, as: 'creator', include: [{ model: StaffProfile, as: 'profile' }] },
        { model: MeetingAttendee, as: 'attendeeRecords', include: [{ model: User, as: 'user', include: [{ model: StaffProfile, as: 'profile' }] }] }
      ],
      order: [['scheduledAt', 'DESC']]
    });

    const statusCounts = meetings.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});

    return {
      type: 'meeting',
      date: date || null,
      total: meetings.length,
      statusCounts,
      closedCount: meetings.filter(item => item.isClosed).length,
      items: meetings.slice(0, 10).map(item => ({
        title: item.title,
        creator: item.creator?.profile?.name || item.creator?.phone,
        status: item.status,
        scheduledAt: item.scheduledAt,
        attendees: (item.attendeeRecords || []).map(record => ({
          name: record.user?.profile?.name || record.user?.phone,
          status: record.status
        }))
      }))
    };
  }

  async getTicketSummary(orgAccountId, date, staffName) {
    const where = { orgAccountId };
    if (date) where.dueDate = date;

    if (staffName) {
      const users = await this.findUsersByName(orgAccountId, staffName);
      if (!users.length) return { total: 0, statusCounts: {}, items: [] };
      const ids = users.map(user => user.id);
      where[Op.or] = [{ allocatedBy: ids }, { allocatedTo: ids }];
    }

    const tickets = await Ticket.findAll({
      where,
      include: [
        { model: User, as: 'creator', include: [{ model: StaffProfile, as: 'profile' }] },
        { model: User, as: 'assignee', include: [{ model: StaffProfile, as: 'profile' }] }
      ],
      order: [['createdAt', 'DESC']]
    });

    const statusCounts = tickets.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});
    const priorityCounts = tickets.reduce((acc, item) => {
      acc[item.priority] = (acc[item.priority] || 0) + 1;
      return acc;
    }, {});

    return {
      type: 'ticket',
      date: date || null,
      total: tickets.length,
      statusCounts,
      priorityCounts,
      closedCount: tickets.filter(item => item.isClosed).length,
      items: tickets.slice(0, 10).map(item => ({
        title: item.title,
        creator: item.creator?.profile?.name || item.creator?.phone,
        assignee: item.assignee?.profile?.name || item.assignee?.phone,
        status: item.status,
        priority: item.priority,
        dueDate: item.dueDate,
        remarks: item.remarks || null
      }))
    };
  }

  async getActivityCompletions(orgAccountId, date, staffName) {
    const where = { orgAccountId, status: 'DONE' };
    if (date) where.date = date;

    if (staffName) {
      const users = await this.findUsersByName(orgAccountId, staffName);
      if (!users.length) return { type: 'activity', totalCompleted: 0, completedBy: [] };
      where.userId = users.map(user => user.id);
    }

    const activities = await Activity.findAll({
      where,
      include: [{ model: User, as: 'user', include: [{ model: StaffProfile, as: 'profile' }] }],
      order: [['updatedAt', 'DESC']]
    });

    return {
      type: 'activity',
      totalCompleted: activities.length,
      completedBy: activities.map(item => ({
        title: item.title,
        name: item.user?.profile?.name || item.user?.phone,
        date: item.date,
        updatedAt: item.updatedAt
      }))
    };
  }

  async getMeetingCompletions(orgAccountId, date, staffName) {
    const where = { orgAccountId, status: 'DONE' };
    if (date) {
      where.scheduledAt = {
        [Op.between]: [dayjs(date).startOf('day').toDate(), dayjs(date).endOf('day').toDate()]
      };
    }

    if (staffName) {
      const users = await this.findUsersByName(orgAccountId, staffName);
      if (!users.length) return { type: 'meeting', totalCompleted: 0, completedBy: [] };
      where.createdBy = users.map(user => user.id);
    }

    const meetings = await Meeting.findAll({
      where,
      include: [{ model: User, as: 'creator', include: [{ model: StaffProfile, as: 'profile' }] }],
      order: [['updatedAt', 'DESC']]
    });

    return {
      type: 'meeting',
      totalCompleted: meetings.length,
      completedBy: meetings.map(item => ({
        title: item.title,
        name: item.creator?.profile?.name || item.creator?.phone,
        scheduledAt: item.scheduledAt,
        updatedAt: item.updatedAt
      }))
    };
  }

  async getTicketCompletions(orgAccountId, date, staffName) {
    const where = { orgAccountId, status: 'DONE' };
    if (date) where.dueDate = date;

    if (staffName) {
      const users = await this.findUsersByName(orgAccountId, staffName);
      if (!users.length) return { type: 'ticket', totalCompleted: 0, completedBy: [] };
      where.allocatedTo = users.map(user => user.id);
    }

    const tickets = await Ticket.findAll({
      where,
      include: [{ model: User, as: 'assignee', include: [{ model: StaffProfile, as: 'profile' }] }],
      order: [['updatedAt', 'DESC']]
    });

    return {
      type: 'ticket',
      totalCompleted: tickets.length,
      completedBy: tickets.map(item => ({
        title: item.title,
        name: item.assignee?.profile?.name || item.assignee?.phone,
        dueDate: item.dueDate,
        updatedAt: item.updatedAt
      }))
    };
  }

  buildSalesRange(date, period = 'monthly') {
    const base = date ? dayjs(date) : dayjs();

    switch (period) {
      case 'daily':
        return { start: base.startOf('day').toDate(), end: base.endOf('day').toDate() };
      case 'weekly':
        return { start: base.startOf('week').toDate(), end: base.endOf('week').toDate() };
      case 'monthly':
      default:
        return { start: base.startOf('month').toDate(), end: base.endOf('month').toDate() };
    }
  }

  async getSalesUsers(orgAccountId, staffName) {
    if (!staffName) {
      return [];
    }

    return await this.findUsersByName(orgAccountId, staffName);
  }

  async getSalesSummary(orgAccountId, date, period, staffName) {
    const resolvedPeriod = period || (date ? 'daily' : 'monthly');
    const { start, end } = this.buildSalesRange(date, resolvedPeriod);
    const users = staffName ? await this.getSalesUsers(orgAccountId, staffName) : [];
    if (staffName && !users.length) {
      return { period: resolvedPeriod, totalOrders: 0, totalVisits: 0, totalAmount: 0, conversionRate: 0, topPerformers: [] };
    }

    const userIds = users.map(user => user.id);
    const orderWhere = {
      orgAccountId,
      orderDate: { [Op.between]: [start, end] }
    };
    const visitWhere = {
      orgAccountId,
      visitDate: { [Op.between]: [start, end] }
    };
    if (userIds.length) {
      orderWhere.userId = userIds;
      visitWhere.userId = userIds;
    }

    const [orders, visits] = await Promise.all([
      Order.findAll({
        where: orderWhere,
        include: [{ model: User, as: 'user', include: [{ model: StaffProfile, as: 'profile' }] }]
      }),
      SalesVisit.findAll({
        where: visitWhere,
        include: [{ model: User, as: 'user', include: [{ model: StaffProfile, as: 'profile' }] }]
      })
    ]);

    const totalAmount = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
    const staffMap = new Map();

    for (const order of orders) {
      const name = order.user?.profile?.name || order.user?.phone || 'Unknown';
      const entry = staffMap.get(name) || { name, orders: 0, amount: 0, visits: 0 };
      entry.orders += 1;
      entry.amount += Number(order.totalAmount || 0);
      staffMap.set(name, entry);
    }

    for (const visit of visits) {
      const name = visit.user?.profile?.name || visit.salesPerson || visit.user?.phone || 'Unknown';
      const entry = staffMap.get(name) || { name, orders: 0, amount: 0, visits: 0 };
      entry.visits += 1;
      staffMap.set(name, entry);
    }

    return {
      period: resolvedPeriod,
      rangeStart: start,
      rangeEnd: end,
      totalOrders: orders.length,
      totalVisits: visits.length,
      totalAmount: Math.round(totalAmount),
      conversionRate: visits.length ? Math.round((orders.length / visits.length) * 100) : 0,
      topPerformers: Array.from(staffMap.values())
        .sort((left, right) => right.amount - left.amount || right.orders - left.orders)
        .slice(0, 10)
        .map(item => ({
          ...item,
          amount: Math.round(item.amount)
        }))
    };
  }

  async getSalesOrders(orgAccountId, date, staffName) {
    const { start, end } = this.buildSalesRange(date, date ? 'daily' : 'monthly');
    const users = staffName ? await this.getSalesUsers(orgAccountId, staffName) : [];
    if (staffName && !users.length) {
      return { totalOrders: 0, orders: [] };
    }

    const where = {
      orgAccountId,
      orderDate: { [Op.between]: [start, end] }
    };
    if (users.length) {
      where.userId = users.map(user => user.id);
    }

    const orders = await Order.findAll({
      where,
      include: [
        { model: User, as: 'user', include: [{ model: StaffProfile, as: 'profile' }] },
        { model: Client, as: 'client' }
      ],
      order: [['orderDate', 'DESC']]
    });

    return {
      totalOrders: orders.length,
      orders: orders.slice(0, 25).map(order => ({
        orderId: order.id,
        name: order.user?.profile?.name || order.user?.phone,
        clientName: order.client?.name || null,
        amount: Math.round(Number(order.totalAmount || 0)),
        orderDate: order.orderDate,
        paymentMethod: order.paymentMethod || null,
        phone: order.phone || order.client?.phone || null
      }))
    };
  }

  async getSalesVisits(orgAccountId, date, staffName) {
    const { start, end } = this.buildSalesRange(date, date ? 'daily' : 'monthly');
    const users = staffName ? await this.getSalesUsers(orgAccountId, staffName) : [];
    if (staffName && !users.length) {
      return { totalVisits: 0, visits: [] };
    }

    const where = {
      orgAccountId,
      visitDate: { [Op.between]: [start, end] }
    };
    if (users.length) {
      where.userId = users.map(user => user.id);
    }

    const visits = await SalesVisit.findAll({
      where,
      include: [{ model: User, as: 'user', include: [{ model: StaffProfile, as: 'profile' }] }],
      order: [['visitDate', 'DESC']]
    });

    return {
      totalVisits: visits.length,
      visits: visits.slice(0, 25).map(visit => ({
        visitId: visit.id,
        name: visit.user?.profile?.name || visit.salesPerson || visit.user?.phone,
        clientName: visit.clientName || null,
        visitType: visit.visitType || null,
        location: visit.location || null,
        visitDate: visit.visitDate,
        madeOrder: !!visit.madeOrder,
        amount: Math.round(Number(visit.amount || 0)),
        verified: !!visit.verified
      }))
    };
  }

  async getSalesTargetStatus(orgAccountId, date, period = 'monthly', staffName) {
    const resolvedPeriod = period || 'monthly';
    const { start, end } = this.buildSalesRange(date, resolvedPeriod);
    const users = staffName ? await this.getSalesUsers(orgAccountId, staffName) : [];
    if (staffName && !users.length) {
      return { period: resolvedPeriod, totalTargets: 0, completedTargets: 0, items: [] };
    }

    const targetWhere = {
      orgAccountId,
      period: resolvedPeriod,
      periodDate: { [Op.between]: [dayjs(start).format('YYYY-MM-DD'), dayjs(end).format('YYYY-MM-DD')] }
    };
    if (users.length) {
      targetWhere.staffUserId = users.map(user => user.id);
    }

    const targets = await SalesTarget.findAll({
      where: targetWhere,
      include: [{ model: User, as: 'staff', include: [{ model: StaffProfile, as: 'profile' }] }],
      order: [['periodDate', 'DESC']]
    });

    const items = await Promise.all(targets.map(async (target) => {
      const orderWhere = {
        orgAccountId,
        userId: target.staffUserId,
        orderDate: { [Op.between]: [start, end] }
      };

      const orders = await Order.findAll({ where: orderWhere });
      const achievedOrders = orders.length;
      const achievedAmount = Math.round(orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0));
      const amountMet = Number(target.targetAmount || 0) <= 0 || achievedAmount >= Number(target.targetAmount || 0);
      const ordersMet = Number(target.targetOrders || 0) <= 0 || achievedOrders >= Number(target.targetOrders || 0);

      return {
        name: target.staff?.profile?.name || target.staff?.phone,
        period: target.period,
        periodDate: target.periodDate,
        targetAmount: Math.round(Number(target.targetAmount || 0)),
        targetOrders: Number(target.targetOrders || 0),
        achievedAmount,
        achievedOrders,
        completed: amountMet && ordersMet
      };
    }));

    return {
      period: resolvedPeriod,
      rangeStart: start,
      rangeEnd: end,
      totalTargets: items.length,
      completedTargets: items.filter(item => item.completed).length,
      items
    };
  }
}

module.exports = new AIChatService();
