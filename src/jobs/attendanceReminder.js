const { Op } = require('sequelize');
const dayjs = require('dayjs');
const {
    User, StaffProfile, Attendance, OrgAccount,
    WeeklyOffTemplate, StaffWeeklyOffAssignment,
    HolidayDate, StaffHolidayAssignment,
    LeaveRequest, AppSetting, sequelize
} = require('../models');

async function checkMissingAttendanceAndNotify() {
    console.log('[ATTENDANCE REMINDER] Starting missing attendance check...');

    // Yesterday's date in IST
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    console.log(`[ATTENDANCE REMINDER] Checking for date: ${yesterday}`);

    try {
        const activeOrgs = await OrgAccount.findAll({ where: { status: 'ACTIVE' } });

        for (const org of activeOrgs) {
            console.log(`[ATTENDANCE REMINDER] Processing Org: ${org.name} (ID: ${org.id})`);

            const rowSet = await AppSetting.findOne({ where: { key: 'org_config', orgAccountId: org.id } });
            let canSend = true;
            if (rowSet?.value) {
                try {
                    const cfg = JSON.parse(rowSet.value);
                    if (cfg?.smsNotificationSettings?.missingAttendance === false) canSend = false;
                } catch (_) { }
            }

            if (!canSend) {
                console.log(`[ATTENDANCE REMINDER] Skipping ${org.name} - SMS notification disabled in settings`);
                continue;
            }

            const staffMembers = await User.findAll({
                where: { orgAccountId: org.id, active: true, role: 'staff' },
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

                const bizName = org.name || 'Business';
                const d = new Date(yesterday);
                const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
                const day = d.getDate();
                const m = months[d.getMonth()];
                const suffix = (day % 10 === 1 && day !== 11) ? 'st' : (day % 10 === 2 && day !== 12) ? 'nd' : (day % 10 === 3 && day !== 13) ? 'rd' : 'th';
                const dateStr = `${day}${suffix} ${m}`;

                const normalized = String(phone || '').replace(/[^0-9]/g, '');
                let fullPhone = normalized;
                if (fullPhone.length === 10) fullPhone = '91' + fullPhone;

                if (fullPhone.length >= 10) {
                    const smsText = `Hi ${name}, attendance for ${dateStr} is missing for ${bizName} - {org.name} - vetansutra.com ( Powered by Thinktech Software company)`;
                    const smsUrl = `http://182.18.162.128/api/mt/SendSMS?APIKEY=85I1g6L9hEeIntNZgQRrzA&senderid=VETANS&channel=Trans&DCS=0&flashsms=0&number=${fullPhone}&text=${encodeURIComponent(smsText)}&route=08`;

                    console.log(`[ATTENDANCE REMINDER] Sending SMS to ${fullPhone}: ${smsText}`);
                    try {
                        const resp = await fetch(smsUrl);
                        const body = await resp.text();
                        console.log(`[ATTENDANCE REMINDER] SMS Result for ${name}:`, { ok: resp.ok, body });
                    } catch (smsErr) {
                        console.error(`[ATTENDANCE REMINDER] SMS Fetch failed for ${name}:`, smsErr.message);
                    }
                }
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
