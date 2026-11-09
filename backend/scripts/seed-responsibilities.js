const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const { INITIAL_ROLES_RESPONSIBILITIES } = require('../dist/modules/responsibilities/responsibilities.data');

async function main() {
  console.log(`Starting to seed ${INITIAL_ROLES_RESPONSIBILITIES.length} compliance formats...`);
  let count = 0;
  for (const item of INITIAL_ROLES_RESPONSIBILITIES) {
    const existing = await prisma.roleResponsibility.findFirst({
      where: { reportNo: item.reportNo }
    });
    if (!existing) {
      await prisma.roleResponsibility.create({
        data: {
          sheetNo: item.sheetNo,
          reportNo: item.reportNo,
          title: item.title,
          section: item.section,
          frequency: item.frequency,
          hyperlink: item.hyperlink || '',
          filledBy: item.filledBy,
          assignedFaculty: item.assignedFaculty || '',
          verifiedBy: item.verifiedBy || '',
          department: item.department || 'Mechanical Engineering',
          status: 'CONFIGURED'
        }
      });
      count++;
    }
  }
  const total = await prisma.roleResponsibility.count();
  console.log(`Seeding complete. Inserted: ${count}, Total in DB: ${total}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

