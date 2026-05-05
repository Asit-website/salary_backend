const { HolidayWorkPayRule, StaffHolidayWorkPayAssignment } = require('../models');
const { Op } = require('sequelize');

class HolidayWorkPayService {
    async getEffectiveRule(userId, dateKey) {
        try {
            const assignment = await StaffHolidayWorkPayAssignment.findOne({
                where: {
                    userId,
                    effectiveFrom: { [Op.lte]: dateKey },
                    [Op.or]: [
                        { effectiveTo: null },
                        { effectiveTo: { [Op.gte]: dateKey } }
                    ],
                    active: true
                },
                order: [['effectiveFrom', 'DESC']],
                include: [{ model: HolidayWorkPayRule, as: 'rule' }]
            });

            return assignment?.rule || null;
        } catch (error) {
            console.error('Error fetching effective holiday work pay rule:', error);
            return null;
        }
    }
}

module.exports = new HolidayWorkPayService();
