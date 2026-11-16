const { PrismaClient } = require('../node_modules/@prisma/client');
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:c:/Users/LENOVO/OneDrive/Desktop/College ERP/backend/prisma/erp.db';
const prisma = new PrismaClient();
const fs = require('fs');

async function main() {
  console.log('Generating unified syllabus_roster.json from database...');
  const faculties = await prisma.faculty.findMany({
    include: {
      syllabusTopics: {
        orderBy: { orderIndex: 'asc' }
      }
    }
  });

  const roster = {};
  for (const f of faculties) {
    roster[f.employeeId] = {
      name: `${f.firstName} ${f.lastName}`,
      maxWeeklyHours: f.maxWeeklyHours,
      topics: f.syllabusTopics.map(t => ({
        title: t.title,
        description: t.description,
        allottedMinutes: t.allottedMinutes,
        status: t.status
      }))
    };
  }

  fs.writeFileSync('c:/Users/LENOVO/OneDrive/Desktop/College ERP/backend/prisma/syllabus_roster.json', JSON.stringify(roster, null, 2));
  console.log(`Generated unified roster for ${faculties.length} faculties with ${await prisma.syllabusTopic.count()} total topics.`);
}

main().finally(() => prisma.$disconnect());
