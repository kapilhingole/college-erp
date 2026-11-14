const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Assigning professors to subjects...');
  const allFaculty = await prisma.faculty.findMany({ include: { department: true } });
  const allSubjects = await prisma.subject.findMany();
  const batches = await prisma.batch.findMany();
  const defaultBatch = batches[0];

  for (let i = 0; i < allSubjects.length; i++) {
    const sub = allSubjects[i];
    const deptFaculty = allFaculty.filter(f => f.departmentId === sub.departmentId);
    const assignedFac = deptFaculty.length > 0 ? deptFaculty[i % deptFaculty.length] : allFaculty[i % allFaculty.length];

    if (assignedFac && defaultBatch) {
      const existing = await prisma.facultySubjectAssignment.findFirst({
        where: { subjectId: sub.id, facultyId: assignedFac.id }
      });
      if (!existing) {
        await prisma.facultySubjectAssignment.create({
          data: {
            subjectId: sub.id,
            facultyId: assignedFac.id,
            batchId: defaultBatch.id,
            academicSession: '2024-25',
          }
        });
      }
    }
  }

  console.log('✅ Faculty subject assignments created.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
