const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Inspecting departments...');
  const allDepts = await prisma.department.findMany({
    include: {
      _count: {
        select: { students: true, faculty: true, subjects: true }
      }
    }
  });
  console.log('Current departments:', allDepts.map(d => ({
    id: d.id,
    code: d.code,
    name: d.name,
    students: d._count.students,
    faculty: d._count.faculty,
    subjects: d._count.subjects,
  })));

  // Target unwanted departments: anything other than AIDS, COMP/CE, ECE, ENTC/E&TC
  const unwantedCodes = ['IT', 'CIVIL', 'MECH'];
  const unwanted = await prisma.department.findMany({
    where: { code: { in: unwantedCodes } },
    include: { faculty: true, students: true, programs: true }
  });

  console.log('Found unwanted departments:', unwanted.map(d => d.code));

  // If there are any faculty in unwanted departments, reassign them to COMP or ECE or ENTC
  const compDept = await prisma.department.findFirst({ where: { code: 'COMP' } });

  for (const dept of unwanted) {
    if (dept.faculty.length > 0 && compDept) {
      console.log(`Reassigning ${dept.faculty.length} faculty from ${dept.code} to COMP...`);
      await prisma.faculty.updateMany({
        where: { departmentId: dept.id },
        data: { departmentId: compDept.id }
      });
    }

    if (dept.students.length > 0 && compDept) {
      console.log(`Reassigning ${dept.students.length} students from ${dept.code} to COMP...`);
      await prisma.student.updateMany({
        where: { departmentId: dept.id },
        data: { departmentId: compDept.id }
      });
    }

    // Delete programs, batches, sections belonging to this department
    for (const prog of dept.programs) {
      const batches = await prisma.batch.findMany({ where: { programId: prog.id } });
      for (const b of batches) {
        await prisma.section.deleteMany({ where: { batchId: b.id } });
      }
      await prisma.batch.deleteMany({ where: { programId: prog.id } });
    }
    await prisma.program.deleteMany({ where: { departmentId: dept.id } });

    // Delete subjects belonging to this department
    await prisma.subject.deleteMany({ where: { departmentId: dept.id } });

    // Delete the department itself
    await prisma.department.delete({ where: { id: dept.id } });
    console.log(`✅ Deleted unwanted department: ${dept.code}`);
  }

  // Update COMP name to "Computer Engineering (CE)" and ENTC to "Electronics & Telecommunication (E&TC)" if needed
  await prisma.department.updateMany({
    where: { code: 'COMP' },
    data: { name: 'Computer Engineering' }
  });

  await prisma.department.updateMany({
    where: { code: 'ENTC' },
    data: { name: 'Electronics & Telecommunication' }
  });

  const remainingDepts = await prisma.department.findMany({
    select: { id: true, code: true, name: true, _count: { select: { students: true, faculty: true, subjects: true } } }
  });
  console.log('\nRemaining strictly 4 departments:', remainingDepts);
}

main().catch(console.error).finally(() => prisma.$disconnect());
