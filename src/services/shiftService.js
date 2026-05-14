const { StaffRoster, StaffShiftAssignment, ShiftTemplate, User, StaffProfile } = require('../models');
const { Op } = require('sequelize');
const dayjs = require('dayjs');

/**
 * Centralized Shift Service
 * Ensures consistent shift resolution across all platforms (ZKTeco, Mobile, Kiosk)
 */
class ShiftService {
    /**
     * Get the effective shift template for a user on a specific date.
     * Priority: Roster > StaffShiftAssignment > User Default Shift
     */
    async getEffectiveShiftTemplate(userId, date) {
        try {
            if (!userId || !date) return null;

            // Ensure date is in YYYY-MM-DD format for DB lookup
            const dateStr = dayjs(date).format('YYYY-MM-DD');

            // 1. Check Roster (Highest Priority - Daily Override)
            const roster = await StaffRoster.findOne({ 
                where: { userId, date: dateStr },
                include: [{ model: ShiftTemplate, as: 'shiftTemplate' }]
            });

            if (roster) {
                if (roster.status === 'SHIFT' && roster.shiftTemplate) {
                    if (roster.shiftTemplate.active !== false) {
                        console.log(`[ShiftService] Roster OVERRIDE found for User: ${userId}, Date: ${dateStr}, Shift: ${roster.shiftTemplate.name} (${roster.shiftTemplate.startTime}-${roster.shiftTemplate.endTime})`);
                        return roster.shiftTemplate;
                    }
                }
                // If roster says Weekly Off or Holiday, return null (no shift today)
                if (roster.status === 'WEEKLY_OFF' || roster.status === 'HOLIDAY') {
                    console.log(`[ShiftService] Roster status: ${roster.status} for User: ${userId}, Date: ${dateStr}`);
                    return null;
                }
            }

            // 2. Check Staff Shift Assignment (Middle Priority - Scheduled Assignment)
            const asg = await StaffShiftAssignment.findOne({
                where: {
                    userId,
                    effectiveFrom: { [Op.lte]: dateStr },
                    [Op.or]: [
                        { effectiveTo: null },
                        { effectiveTo: { [Op.gte]: dateStr } }
                    ]
                },
                order: [['effectiveFrom', 'DESC'], ['id', 'DESC']],
                include: [{ model: ShiftTemplate, as: 'template' }]
            });

            if (asg && asg.template && asg.template.active !== false) {
                return asg.template;
            }

            // 3. Check User Profile Default (Lowest Priority - Fallback)
            const user = await User.findByPk(userId, { 
                include: [{ model: StaffProfile, as: 'profile' }] 
            });

            if (user?.shiftTemplateId) {
                const tpl = await ShiftTemplate.findByPk(user.shiftTemplateId);
                if (tpl && tpl.active !== false) return tpl;
            }

            if (user?.profile?.shiftSelection) {
                const tpl = await ShiftTemplate.findOne({ 
                    where: { id: Number(user.profile.shiftSelection), active: true } 
                });
                if (tpl) return tpl;
            }

            return null;
        } catch (error) {
            console.error(`[ShiftService] Error resolving shift for User: ${userId}, Date: ${date}`, error);
            return null;
        }
    }

    /**
     * Resolve shift in-memory using pre-fetched data context.
     * context: { rosters, shiftAssignments, staffMembers, shiftTemplateMap }
     * dateStr: YYYY-MM-DD
     */
    resolveShift(userId, dateStr, context) {
        const { rosters = [], shiftAssignments = [], staffMembers = [], shiftTemplateMap = {} } = context;
        const sId = String(userId);

        // 1. Roster (Daily override)
        const ros = rosters.find(r => String(r.userId) === sId && dayjs(r.date).format('YYYY-MM-DD') === dateStr);
        if (ros?.shiftTemplate) return ros.shiftTemplate;

        // 2. Assignment (Range-based)
        const asg = shiftAssignments.filter(a => 
            String(a.userId) === sId && 
            dateStr >= dayjs(a.effectiveFrom).format('YYYY-MM-DD') && 
            (!a.effectiveTo || dateStr <= dayjs(a.effectiveTo).format('YYYY-MM-DD'))
        ).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
        
        if (asg?.template) return asg.template;

        // 3. Profile / Default
        const staff = staffMembers.find(s => String(s.id) === sId);
        if (staff?.shiftTemplateId) return shiftTemplateMap[Number(staff.shiftTemplateId)];
        if (staff?.profile?.shiftSelection) return shiftTemplateMap[Number(staff.profile.shiftSelection)];
        if (staff?.shiftTemplate) return staff.shiftTemplate;

        return null;
    }
}

module.exports = new ShiftService();
