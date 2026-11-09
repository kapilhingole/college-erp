import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { INITIAL_ROLES_RESPONSIBILITIES } from '../src/modules/responsibilities/responsibilities.data';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Initializing Clean Slate Database for Zeal College of Engineering and Research (ZCOER)...');
  console.log('   Campus: Induri Campus, Pune');

  // 1. Wipe all existing transactional and dummy records
  await prisma.auditLog.deleteMany({});
  await prisma.notice.deleteMany({});
  await prisma.bookIssueRecord.deleteMany({});
  await prisma.book.deleteMany({});
  await prisma.feePayment.deleteMany({});
  await prisma.studentFeeLedger.deleteMany({});
  await prisma.feeComponent.deleteMany({});
  await prisma.feeStructure.deleteMany({});
  await prisma.studentSemesterResult.deleteMany({});
  await prisma.marksEntry.deleteMany({});
  await prisma.examSchedule.deleteMany({});
  await prisma.exam.deleteMany({});
  await prisma.attendanceRecord.deleteMany({});
  await prisma.lectureSession.deleteMany({});
  await prisma.timetableSlot.deleteMany({});
  await prisma.facultySubjectAssignment.deleteMany({});
  await prisma.subject.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.faculty.deleteMany({});
  await prisma.managementProfile.deleteMany({});
  await prisma.section.deleteMany({});
  await prisma.batch.deleteMany({});
  await prisma.program.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('🧹 Purged all dummy and synthetic records.');

  // 2. Hash administrative passwords with bcrypt (10 rounds)
  const superAdminPassword = await bcrypt.hash('SuperAdmin@123', 10);
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const managementPassword = await bcrypt.hash('Admin@123', 10);

  // 3. Administrative Personas
  const superAdminUser = await prisma.user.create({
    data: {
      email: 'superadmin@zeal.edu.in',
      passwordHash: superAdminPassword,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      managementProfile: {
        create: {
          employeeId: 'MGMT-ZCOER-000',
          firstName: 'System',
          lastName: 'SuperAdmin',
          email: 'superadmin@zeal.edu.in',
          phone: '+91 2114 667800',
          designation: 'Chief Information Officer',
          office: 'IT & Data Center, ZES Induri Campus',
        },
      },
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@zeal.edu.in',
      passwordHash: adminPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
      managementProfile: {
        create: {
          employeeId: 'MGMT-ZCOER-002',
          firstName: 'Academic',
          lastName: 'Registrar',
          email: 'admin@zeal.edu.in',
          phone: '+91 2114 667801',
          designation: 'Registrar & Student Affairs Head',
          office: 'Student Section, ZES Induri Campus',
        },
      },
    },
  });

  const managementUser = await prisma.user.create({
    data: {
      email: 'management@zeal.edu.in',
      passwordHash: managementPassword,
      role: 'MANAGEMENT',
      status: 'ACTIVE',
      managementProfile: {
        create: {
          employeeId: 'MGMT-ZCOER-001',
          firstName: 'Campus',
          lastName: 'Director',
          email: 'management@zeal.edu.in',
          phone: '+91 2114 667802',
          designation: 'Director of Administration & Operations',
          office: 'Administrative Complex, ZES Induri Campus, Pune',
        },
      },
    },
  });

  // 4. Academic Departments (4 Official ZCOER Induri Disciplines)
  const departmentsData = [
    { code: 'AIDS', name: 'Artificial Intelligence and Data Science', description: 'Department of Artificial Intelligence and Data Science (AI, Deep Learning, Big Data)' },
    { code: 'COMP', name: 'Computer Engineering', description: 'Department of Computer Engineering (Cloud Computing, Software Systems, Cybersecurity)' },
    { code: 'ENTC', name: 'Electronic and Telecommunication', description: 'Department of Electronic and Telecommunication (5G, IoT, Embedded Systems, VLSI)' },
    { code: 'ECE', name: 'Electronic and Computer Engineering', description: 'Department of Electronic and Computer Engineering (Intelligent Hardware, Edge AI, Robotics)' },
  ];

  const depts: any[] = [];
  for (const d of departmentsData) {
    const dept = await prisma.department.create({ data: d });
    depts.push(dept);
  }

  // 5. Programs, Batches & Divisions for each Department
  const programs: any[] = [];
  const batches: any[] = [];
  const sections: any[] = [];

  for (const dept of depts) {
    const prog = await prisma.program.create({
      data: {
        departmentId: dept.id,
        code: `BE-${dept.code}`,
        name: `Bachelor of Engineering in ${dept.name}`,
        totalSemesters: 8,
        degreeType: 'UG',
      },
    });
    programs.push(prog);

    // Current Active Batch (2024-2028, Semester 3)
    const batch = await prisma.batch.create({
      data: {
        programId: prog.id,
        name: 'Batch 2024-2028',
        academicYear: '2024-25',
        startYear: 2024,
        endYear: 2028,
        currentSemester: 3,
      },
    });
    batches.push(batch);

    // Divisions A and B
    const secA = await prisma.section.create({
      data: {
        batchId: batch.id,
        name: 'Division A',
        capacity: 60,
        roomNumber: `Classroom ${dept.code}-101`,
      },
    });
    const secB = await prisma.section.create({
      data: {
        batchId: batch.id,
        name: 'Division B',
        capacity: 60,
        roomNumber: `Classroom ${dept.code}-102`,
      },
    });
    sections.push(secA, secB);

    // Annual Fee Structure
    const feeStructure = await prisma.feeStructure.create({
      data: {
        name: `B.E. ${dept.code} Year 2 (Sem 3) Fee Structure`,
        departmentId: dept.id,
        programId: prog.id,
        academicYear: '2024-25',
        semester: 3,
        totalAmount: 115000,
        dueDate: new Date('2024-09-30'),
        components: {
          create: [
            { name: 'Tuition Fee', amount: 85000 },
            { name: 'Development Fee', amount: 15000 },
            { name: 'Laboratory & Computing Fee', amount: 10000 },
            { name: 'Library & Student Activities', amount: 5000 },
          ],
        },
      },
    });
  }

  // 6. Master Subjects & Course Credits
  const cseDept = depts.find((d) => d.code === 'CSE')!;
  const itDept = depts.find((d) => d.code === 'IT')!;
  const entcDept = depts.find((d) => d.code === 'ENTC')!;
  const mechDept = depts.find((d) => d.code === 'MECH')!;
  const civilDept = depts.find((d) => d.code === 'CIVIL')!;

  await prisma.subject.createMany({
    data: [
      { code: 'CS301', name: 'Data Structures & Algorithms', departmentId: cseDept.id, semester: 3, credits: 4, type: 'THEORY' },
      { code: 'CS302', name: 'Object Oriented Programming with Java', departmentId: cseDept.id, semester: 3, credits: 4, type: 'THEORY' },
      { code: 'CS303', name: 'Database Management Systems', departmentId: cseDept.id, semester: 3, credits: 4, type: 'THEORY' },
      { code: 'CS304L', name: 'Data Structures Laboratory', departmentId: cseDept.id, semester: 3, credits: 2, type: 'PRACTICAL' },
      { code: 'IT301', name: 'Operating Systems & System Programming', departmentId: itDept.id, semester: 3, credits: 4, type: 'THEORY' },
      { code: 'IT302', name: 'Computer Networks & Protocols', departmentId: itDept.id, semester: 3, credits: 4, type: 'THEORY' },
      { code: 'EC301', name: 'Signals, Systems & DSP', departmentId: entcDept.id, semester: 3, credits: 4, type: 'THEORY' },
      { code: 'ME301', name: 'Thermodynamics & Fluid Power', departmentId: mechDept.id, semester: 3, credits: 4, type: 'THEORY' },
      { code: 'CE301', name: 'Structural Analysis & Mechanics', departmentId: civilDept.id, semester: 3, credits: 4, type: 'THEORY' },
    ],
  });

  // 7. Library Initial Catalog
  await prisma.book.createMany({
    data: [
      { isbn: '978-0262033848', title: 'Introduction to Algorithms (CLRS)', author: 'Cormen, Leiserson, Rivest, Stein', publisher: 'MIT Press', edition: '3rd', totalCopies: 25, availableCopies: 25, shelfLocation: 'Stack CS-1', category: 'Computer Science' },
      { isbn: '978-0131103627', title: 'The C Programming Language', author: 'Brian Kernighan & Dennis Ritchie', publisher: 'Prentice Hall', edition: '2nd', totalCopies: 20, availableCopies: 20, shelfLocation: 'Stack CS-2', category: 'Programming' },
      { isbn: '978-0136086208', title: 'Operating Systems: Internal and Design Principles', author: 'William Stallings', publisher: 'Pearson', edition: '7th', totalCopies: 15, availableCopies: 15, shelfLocation: 'Stack CS-3', category: 'Operating Systems' },
      { isbn: '978-0078022159', title: 'Database System Concepts', author: 'Silberschatz, Korth, Sudarshan', publisher: 'McGraw-Hill', edition: '6th', totalCopies: 20, availableCopies: 20, shelfLocation: 'Stack CS-4', category: 'Databases' },
    ],
  });

  // 8. Official Campus Bulletins
  await prisma.notice.create({
    data: {
      title: 'Academic Term I (2024-25) Commencement at Induri Campus',
      content: 'Welcome students and faculty to Zeal College of Engineering and Research, Induri Campus. All division lectures and laboratory practicals commence as per schedule. Ensure 75% statutory attendance.',
      authorId: superAdminUser.id,
      targetRole: 'ALL',
      priority: 'HIGH',
    },
  });

  // 9. SuperAdmin Roles & Responsibilities Compliance Matrix
  await prisma.roleResponsibility.deleteMany({});
  for (const item of INITIAL_ROLES_RESPONSIBILITIES) {
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
        department: item.department || 'Computer Engineering',
        status: 'CONFIGURED',
      },
    });
  }

  console.log('✅ Clean Slate database initialized successfully!');
  console.log(`   - Roles & Responsibilities Matrix: ${INITIAL_ROLES_RESPONSIBILITIES.length} formats loaded`);
  console.log('   - Departments: 4 (AIDS, COMP, ENTC, ECE)');
  console.log('   - Real Student Count: 0 (Clean table ready for real student data insertion)');
  console.log('   - Administration Accounts:');
  console.log('     * SuperAdmin: superadmin@zeal.edu.in / SuperAdmin@123');
  console.log('     * Campus Director: management@zeal.edu.in / Admin@123');
  console.log('     * Academic Admin: admin@zeal.edu.in / Admin@123');
}

main()
  .catch((e) => {
    console.error('❌ Clean seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
