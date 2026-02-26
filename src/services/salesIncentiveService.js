const { SalesIncentiveRule, StaffIncentiveRule, StaffSalesIncentive, Order, OrderItem } = require('../models');

class SalesIncentiveService {
    /**
     * Process an order to check and record incentives for the salesperson.
     * @param {number} orderId 
     */
    async processOrder(orderId) {
        try {
            const order = await Order.findByPk(orderId, {
                include: [{ model: OrderItem, as: 'items' }]
            });
            if (!order) return;

            const { userId, orgAccountId, netAmount, totalAmount } = order;

            // 1. Get all active rules assigned to this staff
            const assignments = await StaffIncentiveRule.findAll({
                where: { staffUserId: userId, orgAccountId, active: true },
                include: [{ model: SalesIncentiveRule, as: 'rule', where: { active: true } }]
            });

            if (!assignments.length) return;

            for (const assign of assignments) {
                const rule = assign.rule;
                if (!rule) continue;

                let incentiveAmount = 0;
                let achieved = false;

                if (rule.ruleType === 'fixed') {
                    const threshold = Number(rule.config?.targetAmount || 0);
                    if (netAmount >= threshold) {
                        achieved = true;
                        const value = Number(rule.config?.incentiveAmount || 0);
                        if (rule.config?.incentiveType === 'percentage') {
                            incentiveAmount = (netAmount * value) / 100;
                        } else {
                            incentiveAmount = value;
                        }
                    }
                }
                else if (rule.ruleType === 'value_slab') {
                    const slabs = (rule.config?.slabs || []).sort((a, b) => b.min - a.min); // check largest slab first
                    const matchingSlab = slabs.find(s => netAmount >= s.min && (!s.max || netAmount <= s.max));
                    if (matchingSlab) {
                        achieved = true;
                        incentiveAmount = (netAmount * (matchingSlab.percentage || 0)) / 100;
                    }
                }
                else if (rule.ruleType === 'unit_slab') {
                    const totalUnits = order.items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
                    const slabs = (rule.config?.slabs || []).sort((a, b) => b.min - a.min);
                    const matchingSlab = slabs.find(s => totalUnits >= s.min && (!s.max || totalUnits <= s.max));
                    if (matchingSlab) {
                        achieved = true;
                        incentiveAmount = totalUnits * (matchingSlab.amountPerUnit || 0);
                    }
                }

                if (achieved && incentiveAmount > 0) {
                    await StaffSalesIncentive.create({
                        orgAccountId,
                        staffUserId: userId,
                        incentiveRuleId: rule.id,
                        orderId: order.id,
                        achievedAmount: netAmount,
                        incentiveAmount: Number(incentiveAmount.toFixed(2)),
                        status: 'pending'
                    });
                }
            }
        } catch (e) {
            console.error('Incentive Processing Error:', e);
        }
    }
}

module.exports = new SalesIncentiveService();
