const { checkAndPostCelebrations } = require('./src/jobs/socialJob');
const { sequelize } = require('./src/models'); // This loads all models and associations

(async () => {
    console.log('--- Manually Triggering Social Celebrations Check ---');
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected and models loaded.');
        
        await checkAndPostCelebrations();
        
        console.log('✅ Manual trigger completed.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error triggering celebrations:', error);
        process.exit(1);
    }
})();
