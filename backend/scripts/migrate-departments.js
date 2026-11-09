/**
 * Migration script to adjust departments to the exact 4 ZCOER Induri departments:
 * 1. Artificial Intelligence and Data Science (AIDS)
 * 2. Computer Engineering (COMP)
 * 3. Electronic and Telecommunication (ENTC)
 * 4. Electronic and Computer Engineering (ECE)
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Migrating Departments to 4 Official ZCOER Induri Disciplines ---');

  // 1. Get existing departments
  const existingDepts = await prisma.department.findMany();
  console.log('Found', existingDepts.length, 'existing departments.');

  // Target departments specification
  const targetDepts = [
    {
      code: 'AIDS',
      name: 'Artificial Intelligence and Data Science',
      description: 'Department of Artificial Intelligence and Data Science, Deep Learning & Predictive Analytics',
    },
    {
      code: 'COMP',
      name: 'Computer Engineering',
      description: 'Department of Computer Engineering, Software Systems & Cloud Infrastructure',
    },
    {
      code: 'ENTC',
      name: 'Electronic and Telecommunication',
      description: 'Department of Electronic and Telecommunication, Wireless Communications & Embedded IoT',
    },
    {
      code: 'ECE',
      name: 'Electronic and Computer Engineering',
      description: 'Department of Electronic and Computer Engineering, Microprocessors & Intelligent Hardware',
    },
  ];

  // Map or update existing
  // CSE -> COMP
  const cse = existingDepts.find(d => d.code === 'CSE' || d.code === 'COMP');
  let compId;
  if (cse) {
    const updated = await prisma.department.update({
      where: { id: cse.id },
      data: targetDepts[1],
    });
    compId = updated.id;
    console.log('Updated COMP:', compId);
  } else {
    const created = await prisma.department.create({ data: targetDepts[1] });
    compId = created.id;
    console.log('Created COMP:', compId);
  }

  // IT -> AIDS
  const it = existingDepts.find(d => d.code === 'IT' || d.code === 'AIDS');
  let aidsId;
  if (it) {
    const updated = await prisma.department.update({
      where: { id: it.id },
      data: targetDepts[0],
    });
    aidsId = updated.id;
    console.log('Updated AIDS:', aidsId);
  } else {
    const created = await prisma.department.create({ data: targetDepts[0] });
    aidsId = created.id;
    console.log('Created AIDS:', aidsId);
  }

  // ENTC -> Electronic and Telecommunication
  const entc = existingDepts.find(d => d.code === 'ENTC');
  let entcId;
  if (entc) {
    const updated = await prisma.department.update({
      where: { id: entc.id },
      data: targetDepts[2],
    });
    entcId = updated.id;
    console.log('Updated ENTC:', entcId);
  } else {
    const created = await prisma.department.create({ data: targetDepts[2] });
    entcId = created.id;
    console.log('Created ENTC:', entcId);
  }

  // MECH -> ECE (Electronic and Computer Engineering)
  const mech = existingDepts.find(d => d.code === 'MECH' || d.code === 'ECE');
  let eceId;
  if (mech) {
    const updated = await prisma.department.update({
      where: { id: mech.id },
      data: targetDepts[3],
    });
    eceId = updated.id;
    console.log('Updated ECE:', eceId);
  } else {
    const created = await prisma.department.create({ data: targetDepts[3] });
    eceId = created.id;
    console.log('Created ECE:', eceId);
  }

  // CIVIL -> reassign any students, faculties, notices to COMP, then delete CIVIL
  const civil = existingDepts.find(d => d.code === 'CIVIL');
  if (civil) {
    console.log('Reassigning records from CIVIL to COMP...');
    await prisma.student.updateMany({
      where: { departmentId: civil.id },
      data: { departmentId: compId },
    });
    await prisma.faculty.updateMany({
      where: { departmentId: civil.id },
      data: { departmentId: compId },
    });
    await prisma.subject.updateMany({
      where: { departmentId: civil.id },
      data: { departmentId: compId },
    });
    await prisma.feeStructure.updateMany({
      where: { departmentId: civil.id },
      data: { departmentId: compId },
    });
    await prisma.notice.updateMany({
      where: { targetDepartmentId: civil.id },
      data: { targetDepartmentId: compId },
    });

    // Reassign student programId and feeStructures from CIVIL programs to COMP program
    const compProg = await prisma.program.findFirst({ where: { departmentId: compId } });
    const civilPrograms = await prisma.program.findMany({ where: { departmentId: civil.id } });
    for (const prog of civilPrograms) {
      if (compProg) {
        await prisma.student.updateMany({
          where: { programId: prog.id },
          data: { programId: compProg.id },
        });
        await prisma.feeStructure.updateMany({
          where: { programId: prog.id },
          data: { programId: compProg.id },
        });
        await prisma.subject.updateMany({
          where: { departmentId: civil.id },
          data: { departmentId: compId },
        });
      }

      const batches = await prisma.batch.findMany({ where: { programId: prog.id } });
      for (const b of batches) {
        await prisma.student.updateMany({
          where: { batchId: b.id },
          data: { batchId: (await prisma.batch.findFirst({ where: { programId: compProg.id } }))?.id || b.id },
        });
        await prisma.section.deleteMany({ where: { batchId: b.id } });
      }
      await prisma.batch.deleteMany({ where: { programId: prog.id } });
    }
    await prisma.program.deleteMany({ where: { departmentId: civil.id } });
    await prisma.department.delete({ where: { id: civil.id } });
    console.log('CIVIL department cleanly removed.');
  }

  // Update Program Names
  await prisma.program.updateMany({
    where: { departmentId: aidsId },
    data: { code: 'BE-AIDS', name: 'Bachelor of Engineering in Artificial Intelligence and Data Science' },
  });
  await prisma.program.updateMany({
    where: { departmentId: compId },
    data: { code: 'BE-COMP', name: 'Bachelor of Engineering in Computer Engineering' },
  });
  await prisma.program.updateMany({
    where: { departmentId: entcId },
    data: { code: 'BE-ENTC', name: 'Bachelor of Engineering in Electronic and Telecommunication' },
  });
  await prisma.program.updateMany({
    where: { departmentId: eceId },
    data: { code: 'BE-ECE', name: 'Bachelor of Engineering in Electronic and Computer Engineering' },
  });

  // Update string references in RoleResponsibility & MonthlyReportSubmission
  await prisma.roleResponsibility.updateMany({
    where: { department: 'Mechanical Engineering' },
    data: { department: 'Computer Engineering' },
  });

  await prisma.monthlyReportSubmission.updateMany({
    where: { department: 'Mechanical Engineering' },
    data: { department: 'Computer Engineering' },
  });

  const finalDepts = await prisma.department.findMany({
    select: { id: true, code: true, name: true }
  });
  console.log('\nFinal 4 Departments in Database:');
  finalDepts.forEach((d, i) => console.log(`  ${i + 1}. [${d.code}] ${d.name}`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
