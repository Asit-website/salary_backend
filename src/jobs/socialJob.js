const { StaffProfile, SocialPost, User, OrgAccount, sequelize } = require('../models');
const dayjs = require('dayjs');
const { Op } = require('sequelize');

/**
 * Daily job to check for birthdays and work anniversaries
 * and post automated celebrations to the community feed.
 */
const checkAndPostCelebrations = async () => {
  console.log('--- Social Celebrations Job Started ---');
  try {
    const today = dayjs();
    const monthDay = today.format('MM-DD');

    // 1. Fetch staff with birthdays today
    // We use DATE_FORMAT for more reliable month-day matching across SQL dialects
    console.log(`[DEBUG] Current Time: ${new Date().toISOString()}`);
    console.log(`[DEBUG] monthDay: ${monthDay}`);
    
    const birthdayStaff = await StaffProfile.findAll({
      where: sequelize.where(
        sequelize.fn('DATE_FORMAT', sequelize.col('dob'), '%m-%d'),
        monthDay
      ),
      include: [{ model: User, as: 'user' }]
    });

    console.log(`[DEBUG] Found ${birthdayStaff.length} employees with birthdays today.`);

    for (const staff of birthdayStaff) {
      console.log(`[DEBUG] Processing: Name=${staff.name}, ID=${staff.id}, UserID=${staff.userId}, OrgID=${staff.orgAccountId}`);
      
      if (!staff.userId || !staff.orgAccountId) {
        console.log(`[DEBUG]   >> Skipping: Missing userId or orgAccountId`);
        continue;
      }

      // Fetch the primary admin for this organization to attribute the post
      const orgAdmin = await User.findOne({
        where: { orgAccountId: staff.orgAccountId, role: 'admin' },
        order: [['id', 'ASC']]
      });

      const postingUserId = orgAdmin ? orgAdmin.id : staff.userId; // Fallback to staff if no admin found

      // Check for duplicates今天
      const startOfDay = dayjs().startOf('day').toDate();
      console.log(`[DEBUG]   >> Checking duplicates after: ${startOfDay.toISOString()}`);

      const alreadyPosted = await SocialPost.findOne({
        where: {
            orgAccountId: staff.orgAccountId,
            type: 'birthday',
            content: { [Op.like]: `%${staff.name}%` }, // Check if post about this person exists
            createdAt: {
                [Op.gte]: startOfDay
            }
        }
      });

      if (alreadyPosted) {
        console.log(`[DEBUG]   >> Skipping: Post already exists (ID: ${alreadyPosted.id})`);
        continue;
      }

      try {
        console.log(`[DEBUG]   >> Creating post for ${staff.name} attributed to Admin(${postingUserId})...`);
        const newPost = await SocialPost.create({
          orgAccountId: staff.orgAccountId,
          userId: postingUserId,
          content: `🎂 Happy Birthday to ${staff.name}! Wishing you a fantastic day and a wonderful year ahead! 🎉`,
          type: 'birthday'
        });
        console.log(`✅ Birthday post created: ID=${newPost.id} for ${staff.name}`);
      } catch (postErr) {
        console.error(`[DEBUG]   >> SQL Error during post creation:`, postErr.message);
      }
    }

    // 2. Fetch staff with work anniversaries today
    console.log(`[DEBUG] Searching for anniversaries...`);
    const anniversaryStaff = await StaffProfile.findAll({
      where: sequelize.where(
        sequelize.fn('DATE_FORMAT', sequelize.col('date_of_joining'), '%m-%d'),
        monthDay
      ),
      include: [{ model: User, as: 'user' }]
    });
    console.log(`[DEBUG] Found ${anniversaryStaff.length} employees with anniversaries today.`);

    for (const staff of anniversaryStaff) {
      if (!staff.userId || !staff.orgAccountId || !staff.dateOfJoining) continue;

      const years = today.year() - dayjs(staff.dateOfJoining).year();
      if (years <= 0) continue; // Joined today!

      // Fetch the primary admin for this organization to attribute the post
      const orgAdmin = await User.findOne({
        where: { orgAccountId: staff.orgAccountId, role: 'admin' },
        order: [['id', 'ASC']]
      });

      const postingUserId = orgAdmin ? orgAdmin.id : staff.userId;

      const alreadyPosted = await SocialPost.findOne({
        where: {
            orgAccountId: staff.orgAccountId,
            type: 'anniversary',
            content: { [Op.like]: `%${staff.name}%` },
            createdAt: {
                [Op.gte]: dayjs().startOf('day').toDate()
            }
        }
      });

      if (!alreadyPosted) {
        await SocialPost.create({
          orgAccountId: staff.orgAccountId,
          userId: postingUserId,
          content: `🎊 Happy ${years} Year work anniversary to ${staff.name}! Thank you for your dedication and support! 🚀`,
          type: 'anniversary'
        });
        console.log(`✅ Anniversary post created for ${staff.name} (${years} years) (Org: ${staff.orgAccountId})`);
      }
    }

    console.log('--- Social Celebrations Job Completed ---');
  } catch (error) {
    console.error('❌ Social Celebrations Job Error:', error);
  }
};

module.exports = {
  checkAndPostCelebrations
};
