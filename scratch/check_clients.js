const { OrgAccount } = require('../src/models');

async function inspect() {
  try {
    console.log('=== LISTING LAST 20 ORG ACCOUNTS ===');
    const orgs = await OrgAccount.findAll({
      limit: 20,
      order: [['id', 'DESC']]
    });

    for (const org of orgs) {
      console.log(`Org ID: ${org.id} | Name: ${org.name} | Phone: ${org.phone} | CreatedBy: ${org.createdBy} | Status: ${org.status}`);
    }
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}

inspect();
