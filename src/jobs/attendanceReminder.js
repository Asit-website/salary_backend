const { Op } = require('sequelize');
const dayjs = require('dayjs');
const {
    User, StaffProfile, Attendance, OrgAccount,
    WeeklyOffTemplate, StaffWeeklyOffAssignment,
    HolidayDate, StaffHolidayAssignment,
    LeaveRequest, sequelize
} = require('../models');

// Helper to send SMS (simplified version of auth.js logic)
async function sendSms({ phone, text }) {
    try {
        const API_URL = process.env.SMS_API_URL || 'http://182.18.162.128/api/mt/SendSMS';
        const APIKEY = process.env.SMS_APIKEY || '85I1g6L9hEeIntNZgQRrzA';
        const SENDERID = process.env.SMS_SENDERID || 'VETANS';
        const ROUTE = process.env.SMS_ROUTE || '08';

        const normalized = String(phone || '').replace(/[^0-9]/g, '');
        let fullPhone = normalized;
        if (fullPhone.length === 10) fullPhone = '91' + fullPhone;

        const url = new URL(API_URL);
        url.searchParams.set('APIKEY', APIKEY);
        url.searchParams.set('senderid', SENDERID);
        url.searchParams.set('channel', 'Trans');
        url.searchParams.set('DCS', '0');
        url.searchParams.set('flashsms', '0');
        url.searchParams.set('number', fullPhone);
        url.searchParams.set('text', text);
        url.searchParams.set('route', ROUTE);

        console.log(`[ATTENDANCE REMINDER] Sending SMS to ${fullPhone}`);
        const resp = await fetch(url.toString());
        const body = await resp.text();
        return { ok: resp.ok, body };
    } catch (error) {
        console.error('[ATTENDANCE REMINDER] SMS send failed:', error.message);
        return { ok: false, error: error.message };
    }
}

async function checkMissingAttendanceAndNotify() {
    console.log('[ATTENDANCE REMINDER] Starting missing attendance check...');

    // Yesterday's date in IST
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    console.log(`[ATTENDANCE REMINDER] Checking for date: ${yesterday}`);

    try {
        const activeOrgs = await OrgAccount.findAll({ where: { status: 'ACTIVE' } });

        for (const org of activeOrgs) {
            console.log(`[ATTENDANCE REMINDER] Processing Org: ${org.name} (ID: ${org.id})`);

            const staffMembers = await User.findAll({
                where: { orgAccountId: org.id, status: 'active', role: 'staff' },
                include: [{ model: StaffProfile, as: 'profile' }]
            });

            for (const staff of staffMembers) {
                const userId = staff.id;
                const name = staff.profile?.name || staff.name || 'Staff Member';
                const phone = staff.profile?.phone || staff.phone;

                if (!phone) {
                    console.log(`[ATTENDANCE REMINDER] Skipping ${name} (ID: ${userId}) - No phone number`);
                    continue;
                }

                // 1. Check if attendance record exists
                const att = await Attendance.findOne({
                    where: { userId, date: yesterday }
                });

                if (att) {
                    // Record exists (might be present, late, or even explicitly marked absent/leave)
                    continue;
                }

                // 2. Check if it's a Weekly Off
                const isWO = await checkIsWeeklyOff(userId, yesterday);
                if (isWO) {
                    console.log(`[ATTENDANCE REMINDER] Skipping ${name} - Weekly Off`);
                    continue;
                }

                // 3. Check if it's a Holiday
                const isHoliday = await checkIsHoliday(userId, yesterday);
                if (isHoliday) {
                    console.log(`[ATTENDANCE REMINDER] Skipping ${name} - Holiday`);
                    continue;
                }

                // 4. Check if it's an approved Leave
                const isLeave = await checkIsLeave(userId, yesterday);
                if (isLeave) {
                    console.log(`[ATTENDANCE REMINDER] Skipping ${name} - Approved Leave`);
                    continue;
                }

                // If we reach here, attendance is missing on a workday
                console.log(`[ATTENDANCE REMINDER] Missing attendance detected for ${name} (${phone}) on ${yesterday}`);

                const smsText = `Hi ${name}, attendance for ${dayjs(yesterday).format('Do MMMM')} is missing for ${org.name} - vetansutra.com ( Powered by Thinktech Software company)`;
                const result = await sendSms({ phone, text: smsText });
                console.log(`[ATTENDANCE REMINDER] SMS Result for ${name}:`, result);
            }
        }
        console.log('[ATTENDANCE REMINDER] Missing attendance check completed.');
    } catch (error) {
        console.error('[ATTENDANCE REMINDER] Job failed:', error);
    }
}

async function checkIsWeeklyOff(userId, dateStr) {
    try {
        const jsDate = new Date(dateStr);
        const dow = jsDate.getDay();
        const wk = Math.floor((jsDate.getDate() - 1) / 7) + 1;

        const asg = await StaffWeeklyOffAssignment.findOne({
            where: {
                userId,
                effectiveFrom: { [Op.lte]: dateStr },
                [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: dateStr } }]
            },
            order: [['effectiveFrom', 'DESC']],
            include: [{ model: WeeklyOffTemplate, as: 'template' }]
        });

        if (!asg || !asg.template) return false;

        let config = asg.template.config;
        if (typeof config === 'string') {
            try { config = JSON.parse(config); } catch (e) { return false; }
        }

        if (!Array.isArray(config)) return false;

        for (const cfg of config) {
            if (Number(cfg.day) === dow) {
                if (cfg.weeks === 'all') return true;
                if (Array.isArray(cfg.weeks) && (cfg.weeks.includes(wk) || cfg.weeks.includes(String(wk)))) return true;
            }
        }
        return false;
    } catch (e) {
        console.error(`[ATTENDANCE REMINDER] Error checking Weekly Off for ${userId}:`, e.message);
        return false;
    }
}

async function checkIsHoliday(userId, dateStr) {
    try {
        const asg = await StaffHolidayAssignment.findOne({
            where: {
                userId,
                effectiveFrom: { [Op.lte]: dateStr },
                [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: dateStr } }]
            },
            order: [['effectiveFrom', 'DESC']]
        });

        if (!asg) return false;

        const holiday = await HolidayDate.findOne({
            where: {
                holidayTemplateId: asg.holidayTemplateId,
                date: dateStr,
                active: { [Op.not]: false }
            }
        });

        return !!holiday;
    } catch (e) {
        console.error(`[ATTENDANCE REMINDER] Error checking Holiday for ${userId}:`, e.message);
        return false;
    }
}

async function checkIsLeave(userId, dateStr) {
    try {
        const leave = await LeaveRequest.findOne({
            where: {
                userId,
                status: 'APPROVED',
                startDate: { [Op.lte]: dateStr },
                endDate: { [Op.gte]: dateStr }
            }
        });
        return !!leave;
    } catch (e) {
        console.error(`[ATTENDANCE REMINDER] Error checking Leave for ${userId}:`, e.message);
        return false;
    }
}

module.exports = { checkMissingAttendanceAndNotify };
