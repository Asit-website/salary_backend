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
  StaffRoster
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
  }
];

class AIChatService {
  async handleChat(orgAccountId, message, history = []) {
    if (!aiProvider.isAIEnabled()) {
      return { role: 'assistant', content: "AI is currently disabled. Please configure OPENAI_API_KEY." };
    }

    const messages = [
      { role: 'system', content: `You are an AI Admin Assistant for Thinktech Attendance System. 
        You have access to real-time database tools. Use them to answer admin queries accurately.
        
        CRITICAL FORMATTING RULES:
        1. Use bulleted or numbered lists (point-wise) when presenting multiple items (names, dates, results).
        2. Keep responses professional, concise, and easy to read.
        3. Bold important information like names, amounts, or totals.
        
        Current Organization ID: ${orgAccountId}. 
        Today's Date: ${dayjs().format('YYYY-MM-DD')}.` },
      ...history,
      { role: 'user', content: message }
    ];

    const body = {
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages,
      tools: TOOLS,
      tool_choice: 'auto'
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
          messages: [...messages, responseMessage, ...toolMessages]
        })
      });
      const secondData = await secondResp.json();
      return secondData.choices[0].message;
    }

    return responseMessage;
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
}

module.exports = new AIChatService();
