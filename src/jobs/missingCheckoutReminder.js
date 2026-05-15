const { Op } = require('sequelize');
const dayjs = require('dayjs');
const { User, StaffProfile, Attendance, OrgAccount } = require('../models');
const { sendMissingCheckoutEmail } = require('../services/emailService');

async function checkMissingCheckoutAndNotify() {
    console.log('[MISSING CHECKOUT REMINDER] Starting missing check-out check...');

    // We check for yesterday's attendance date
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    const displayDate = dayjs().subtract(1, 'day').format('DD MMM YYYY');
    
    console.log(`[MISSING CHECKOUT REMINDER] Checking date: ${yesterday}`);

    try {
        // Find active organizations
        const activeOrgs = await OrgAccount.findAll({ where: { status: 'ACTIVE' } });

        for (const org of activeOrgs) {
            if (!org.businessEmail) {
                continue; // Skip if org doesn't have an email
            }

            // Find attendances for yesterday where checkInTime is present but checkOutTime is missing
            const missingAttendances = await Attendance.findAll({
                where: {
                    orgAccountId: org.id,
                    date: yesterday,
                    checkInTime: { [Op.not]: null },
                    checkOutTime: null
                },
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'phone'],
                        include: [{ model: StaffProfile, as: 'profile' }]
                    }
                ]
            });

            if (missingAttendances.length === 0) {
                continue;
            }

            // Prepare list
            const missingCheckoutList = [];
            for (const att of missingAttendances) {
                if (!att.user) continue;
                
                const staffId = att.user.profile?.staffId || '';
                const name = att.user.profile?.name || att.user.name || 'Staff Member';
                const phone = att.user.profile?.phone || att.user.phone || '';
                
                missingCheckoutList.push({ name, staffId, phone });
            }

            if (missingCheckoutList.length > 0) {
                // Find admin user for name to greet in email
                const adminUsers = await User.findAll({ where: { orgAccountId: org.id, role: 'admin' }, limit: 1 });
                const adminName = adminUsers.length > 0 ? (adminUsers[0].name || org.name) : org.name;

                console.log(`[MISSING CHECKOUT REMINDER] Found ${missingCheckoutList.length} missing check-outs for Org: ${org.name}. Sending email...`);
                
                await sendMissingCheckoutEmail(
                    org.businessEmail,
                    adminName,
                    org.name,
                    missingCheckoutList,
                    displayDate
                );
            }
        }

        console.log('[MISSING CHECKOUT REMINDER] Missing check-out check completed.');
    } catch (error) {
        console.error('[MISSING CHECKOUT REMINDER] Job failed:', error);
    }
}

module.exports = { checkMissingCheckoutAndNotify };
