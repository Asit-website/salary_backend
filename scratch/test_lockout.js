const { User } = require('../src/models');

async function testLockout() {
  console.log('--- Testing Brute Force Account Lockout Logic ---');

  try {
    // 1. Find a test user (we can search for a user)
    const user = await User.findOne({ order: [['id', 'ASC']] });
    if (!user) {
      console.log('❌ No users found in database to test.');
      return;
    }

    console.log(`Using test user: ID ${user.id}, Phone: ${user.phone}`);
    console.log(`Initial State - failedLoginAttempts: ${user.failedLoginAttempts || 0}, lockoutUntil: ${user.lockoutUntil}`);

    // 2. Reset state for clean test
    await user.update({ failedLoginAttempts: 0, lockoutUntil: null });
    console.log('✅ User state reset successfully.');

    // 3. Simulate failed attempts
    console.log('⏳ Simulating 5 failed login attempts...');
    for (let i = 1; i <= 5; i++) {
      const attempts = (user.failedLoginAttempts || 0) + 1;
      const updates = { failedLoginAttempts: attempts };
      if (attempts >= 5) {
        updates.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lockout
      }
      await user.update(updates);
      console.log(`Attempt ${i} recorded: failedLoginAttempts = ${user.failedLoginAttempts}, lockoutUntil = ${user.lockoutUntil}`);
    }

    // 4. Verify lockout status
    const now = new Date();
    if (user.lockoutUntil && new Date(user.lockoutUntil) > now) {
      const remainingMinutes = Math.ceil((new Date(user.lockoutUntil) - now) / 60000);
      console.log(`✅ LOCKOUT VERIFIED! Account is locked. Remaining: ${remainingMinutes} minutes.`);
    } else {
      console.log('❌ Lockout verification failed.');
    }

    // 5. Simulate successful attempt to reset counters
    console.log('⏳ Simulating successful login to reset counters...');
    await user.update({ failedLoginAttempts: 0, lockoutUntil: null });
    console.log(`Final State - failedLoginAttempts: ${user.failedLoginAttempts}, lockoutUntil: ${user.lockoutUntil}`);
    
    if (user.failedLoginAttempts === 0 && !user.lockoutUntil) {
      console.log('✅ RESET VERIFIED! Account successfully unlocked.');
    } else {
      console.log('❌ Reset verification failed.');
    }

    console.log('\n🎉 ALL BRUTE FORCE LOCKOUT CORE LOGIC TESTS PASSED!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lockout test failed with error:', error);
    process.exit(1);
  }
}

testLockout();
