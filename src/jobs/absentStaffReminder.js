const { Op } = require('sequelize');
const dayjs = require('dayjs');
const {
    User, StaffProfile, Attendance, OrgAccount,
    WeeklyOffTemplate, StaffWeeklyOffAssignment,
    HolidayDate, StaffHolidayAssignment,
    LeaveRequest
} = require('../models');
const { sendAbsentStaffEmail } = require('../services/emailService');

async function checkAbsentStaffAndNotify() {
    console.log('[ABSENT STAFF REMINDER] Starting absent staff check...');

    // Yesterday's date
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    const displayDate = dayjs().subtract(1, 'day').format('DD MMM YYYY');
    
    console.log(`[ABSENT STAFF REMINDER] Checking for date: ${yesterday}`);

    try {
        const activeOrgs = await OrgAccount.findAll({ where: { status: 'ACTIVE' } });

        for (const org of activeOrgs) {
            if (!org.businessEmail) {
                continue;
            }

            const staffMembers = await User.findAll({
                where: { orgAccountId: org.id, active: true, role: 'staff' },
                include: [{ model: StaffProfile, as: 'profile' }]
            });

            const absentList = [];

            for (const staff of staffMembers) {
                const userId = staff.id;

                // 1. Check if attendance record exists
                const att = await Attendance.findOne({
                    where: { userId, date: yesterday }
                });

                if (att) {
                    continue; // Record exists
                }

                // 2. Check if it's a Weekly Off
                const isWO = await checkIsWeeklyOff(userId, yesterday);
                if (isWO) continue;

                // 3. Check if it's a Holiday
                const isHoliday = await checkIsHoliday(userId, yesterday);
                if (isHoliday) continue;

                // 4. Check if it's an approved Leave
                const isLeave = await checkIsLeave(userId, yesterday);
                if (isLeave) continue;

                // If we reach here, they were absent
                absentList.push({
                    name: staff.profile?.name || staff.name || 'Staff Member',
                    staffId: staff.profile?.staffId || 'N/A',
                    phone: staff.profile?.phone || staff.phone || 'N/A',
                    department: staff.profile?.department || 'N/A'
                });
            }

            if (absentList.length > 0) {
                // Find admin user for name
                const adminUsers = await User.findAll({ where: { orgAccountId: org.id, role: 'admin' }, limit: 1 });
                const adminName = adminUsers.length > 0 ? (adminUsers[0].name || org.name) : org.name;

                console.log(`[ABSENT STAFF REMINDER] Found ${absentList.length} absent staff for Org: ${org.name}. Sending email to ${org.businessEmail}`);
                
                await sendAbsentStaffEmail(
                    org.businessEmail,
                    adminName,
                    org.name,
                    absentList,
                    displayDate
                );
            }
        }
        console.log('[ABSENT STAFF REMINDER] Absent staff check completed.');
    } catch (error) {
        console.error('[ABSENT STAFF REMINDER] Job failed:', error);
    }
}

// Reusing logic from attendanceReminder.js
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
        return false;
    }
}

module.exports = { checkAbsentStaffAndNotify };
