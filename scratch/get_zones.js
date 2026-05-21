const { AppSetting } = require('../src/models');

async function getZones() {
  try {
    const rows = await AppSetting.findAll({
      where: { key: 'qr_attendance_zones' }
    });
    console.log('--- QR Attendance Zones in DB ---');
    for (const r of rows) {
      console.log(`OrgAccountId: ${r.orgAccountId}`);
      console.log(`Value: ${r.value}`);
      console.log('---------------------------------');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

getZones();
