const { sequelize, SocialPost, SocialLike, SocialComment } = require('./src/models');

(async () => {
  console.log('--- Social Network Sync Started ---');
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected.');

    console.log('⏳ Synchronizing SocialPost...');
    await SocialPost.sync({ alter: true });

    console.log('⏳ Synchronizing SocialLike...');
    await SocialLike.sync({ alter: true });

    console.log('⏳ Synchronizing SocialComment...');
    await SocialComment.sync({ alter: true });

    console.log('⏳ Manual check/add community_enabled columns...');
    
    const tables = ['org_accounts', 'plans', 'subscriptions'];
    for (const table of tables) {
      try {
        // Check if column exists
        const [results] = await sequelize.query(`SHOW COLUMNS FROM \`${table}\` LIKE 'community_enabled'`);
        if (results.length === 0) {
          console.log(`  Adding community_enabled to ${table}...`);
          await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN \`community_enabled\` TINYINT(1) NOT NULL DEFAULT 0`);
          console.log(`  ✅ Added to ${table}`);
        } else {
          console.log(`  Column community_enabled already exists in ${table}`);
        }
      } catch (colError) {
        console.error(`  ❌ Error updating table ${table}:`, colError.message);
      }
    }

    console.log('⏳ Seeding social_tab permission...');
    try {
        const [permExists] = await sequelize.query(`SELECT id FROM \`permissions\` WHERE \`name\` = 'social_tab'`);
        if (permExists.length === 0) {
            await sequelize.query(`INSERT INTO \`permissions\` (\`name\`, \`display_name\`, \`created_at\`, \`updated_at\`) VALUES ('social_tab', 'Community Feed Access', NOW(), NOW())`);
            console.log('  ✅ Seeded social_tab permission');
        } else {
            console.log('  Permission social_tab already exists');
        }
    } catch (permError) {
        console.error('  ❌ Error seeding permission:', permError.message);
    }

    console.log('✅ Social models and schema updates synchronized successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error syncing social models:', error);
    process.exit(1);
  }
})();
