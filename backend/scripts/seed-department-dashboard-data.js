const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding rich demonstration data for Department Dashboard...');

  // 1. Get the 4 departments
  const comp = await prisma.department.findUnique({ where: { code: 'COMP' } });
  const aids = await prisma.department.findUnique({ where: { code: 'AIDS' } });
  const ece = await prisma.department.findUnique({ where: { code: 'ECE' } });
  const entc = await prisma.department.findUnique({ where: { code: 'ENTC' } });

  const depts = [comp, aids, ece, entc].filter(Boolean);

  // Ensure faculty are allocated to departments
  const allFaculty = await prisma.faculty.findMany({ include: { department: true } });
  console.log(`Found ${allFaculty.length} faculty across departments.`);

  // 2. Syllabus Topics per Professor (Units 1 to 6 per course)
  const sampleTopics = [
    { title: 'Unit 1: Fundamentals & Core Architecture', allottedMinutes: 180 },
    { title: 'Unit 2: Algorithmic Paradigms & Data Structures', allottedMinutes: 240 },
    { title: 'Unit 3: System Design & Implementation', allottedMinutes: 240 },
    { title: 'Unit 4: Advanced Protocols & Optimizations', allottedMinutes: 180 },
    { title: 'Unit 5: Integration, Testing & Case Studies', allottedMinutes: 180 },
    { title: 'Unit 6: Modern Trends, Security & Emerging Standards', allottedMinutes: 180 },
  ];

  for (let fIdx = 0; fIdx < allFaculty.length; fIdx++) {
    const fac = allFaculty[fIdx];
    const existingTopics = await prisma.syllabusTopic.findMany({ where: { facultyId: fac.id } });

    // Seed 6 syllabus units if fewer than 4 exist
    if (existingTopics.length < 4) {
      // Determine completion status deterministically based on index for realistic distribution
      const completedCount = (fIdx % 5) + 1; // 1 to 5 units completed

      for (let tIdx = 0; tIdx < sampleTopics.length; tIdx++) {
        const tpl = sampleTopics[tIdx];
        const isCompleted = tIdx < completedCount;

        await prisma.syllabusTopic.create({
          data: {
            facultyId: fac.id,
            title: tpl.title,
            description: `Detailed syllabus coverage for ${tpl.title}`,
            orderIndex: tIdx + 1,
            allottedMinutes: tpl.allottedMinutes,
            status: isCompleted ? 'DONE' : 'PENDING',
            completedAt: isCompleted ? new Date(Date.now() - (6 - tIdx) * 86400000 * 4) : null,
          }
        });
      }
    }

    // Set realistic allotted and completed teaching load hours
    const allottedHours = 20; // 20 hours/week standard
    const completedHours = 10 + (fIdx % 10); // 10 to 19 hours completed
    await prisma.faculty.update({
      where: { id: fac.id },
      data: {
        maxWeeklyHours: allottedHours,
        currentLoadHours: completedHours,
      }
    });
  }
  console.log('✅ Syllabus topics and faculty teaching load hours updated.');

  // 3. Lecture Sessions & Attendance Records
  // For each department, find sections and students
  for (const dept of depts) {
    const students = await prisma.student.findMany({
      where: { departmentId: dept.id },
      include: { section: true }
    });

    const deptFaculty = allFaculty.filter(f => f.departmentId === dept.id);
    const facultyMember = deptFaculty.length > 0 ? deptFaculty[0] : allFaculty[0];

    const deptSubjects = await prisma.subject.findMany({ where: { departmentId: dept.id } });
    const subject = deptSubjects.length > 0 ? deptSubjects[0] : (await prisma.subject.findFirst());

    if (!subject || students.length === 0 || !facultyMember) continue;

    // Group students by section
    const sectionIds = [...new Set(students.map(s => s.sectionId).filter(Boolean))];

    for (const secId of sectionIds) {
      const secStudents = students.filter(s => s.sectionId === secId);

      // Create 8 lecture sessions over the past 4 weeks
      for (let sessIdx = 1; sessIdx <= 8; sessIdx++) {
        const sessionDate = new Date(Date.now() - (9 - sessIdx) * 86400000 * 3);
        const session = await prisma.lectureSession.create({
          data: {
            subjectId: subject.id,
            facultyId: facultyMember.id,
            sectionId: secId,
            sessionDate,
            sessionTime: sessIdx % 2 === 0 ? '09:00 - 10:00' : '11:15 - 12:15',
            topicCovered: `Lecture Session ${sessIdx} - ${sampleTopics[(sessIdx - 1) % sampleTopics.length].title}`,
          }
        });

        // Mark attendance for all students in this section
        const attendanceData = secStudents.map((st, stIdx) => {
          // Create realistic attendance distribution:
          // Most students have 80-100% attendance, ~10% have < 75% attendance (defaulters)
          let status = 'PRESENT';
          const rollNum = parseInt(st.rollNumber?.replace(/[^0-9]/g, '') || '0', 10);
          const isDefaulterCandidate = (rollNum % 7 === 0);

          if (isDefaulterCandidate && sessIdx % 2 === 0) {
            status = 'ABSENT';
          } else if (sessIdx === 4 && stIdx % 6 === 0) {
            status = 'ABSENT';
          } else if (sessIdx === 7 && stIdx % 8 === 0) {
            status = 'LATE';
          }

          return {
            lectureSessionId: session.id,
            studentId: st.id,
            status,
            remarks: status === 'ABSENT' ? 'Uninformed absence' : null,
          };
        });

        // Batch insert attendance
        await prisma.attendanceRecord.createMany({
          data: attendanceData,
        });
      }
    }
  }

  console.log('✅ Lecture sessions and student attendance records seeded.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
