const { sequelize, Plan, Subscription, OrgAccount } = require('./src/models');

async function createTestSubscription() {
  try {
    console.log('Creating test subscription...');
    
    // Get the Enterprise plan
    const enterprisePlan = await Plan.findOne({ where: { code: 'ENTERPRISE' } });
    if (!enterprisePlan) {
      console.error('Enterprise plan not found');
      return;
    }
    
    console.log('Found Enterprise plan:', enterprisePlan.name);
    
    // Get the organization (orgAccountId = 1)
    const orgAccount = await OrgAccount.findByPk(1);
    if (!orgAccount) {
      console.error('Organization not found');
      return;
    }
    
    console.log('Found organization:', orgAccount.name);
    
    // Check if subscription already exists
    const existingSubscription = await Subscription.findOne({
      where: { orgAccountId: 1 }
    });
    
    if (existingSubscription) {
      console.log('Subscription already exists, updating...');
      await existingSubscription.update({
        planId: enterprisePlan.id,
        startAt: new Date(),
        endAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        status: 'ACTIVE',
        staffLimit: enterprisePlan.staffLimit,
        meta: {
          maxGeolocationStaff: enterprisePlan.maxGeolocationStaff
        }
      });
      console.log('✅ Subscription updated successfully!');
    } else {
      // Create new subscription
      const subscription = await Subscription.create({
        orgAccountId: 1,
        planId: enterprisePlan.id,
        startAt: new Date(),
        endAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        status: 'ACTIVE',
        staffLimit: enterprisePlan.staffLimit,
        meta: {
          maxGeolocationStaff: enterprisePlan.maxGeolocationStaff
        }
      });
      console.log('✅ Subscription created successfully!');
    }
    
    // Show subscription info
    const subscription = await Subscription.findOne({
      where: { orgAccountId: 1 },
      include: [{ model: Plan, as: 'plan' }]
    });
    
    console.log('\n📋 Subscription Info:');
    console.log(`- Plan: ${subscription.plan.name}`);
    console.log(`- Sales Enabled: ${subscription.plan.salesEnabled ? '✅' : '❌'}`);
    console.log(`- Geolocation Enabled: ${subscription.plan.geolocationEnabled ? '✅' : '❌'}`);
    console.log(`- Max Geolocation Staff: ${subscription.meta?.maxGeolocationStaff || subscription.plan.maxGeolocationStaff}`);
    console.log(`- Staff Limit: ${subscription.plan.staffLimit}`);
    console.log(`- Status: ${subscription.status}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (sequelize && sequelize.close) {
      await sequelize.close();
    }
    process.exit(0);
  }
}

createTestSubscription();
