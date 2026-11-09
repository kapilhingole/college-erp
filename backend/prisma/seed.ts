import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { GradingService } from '../src/services/gradingService';
import { FeeService } from '../src/services/feeService';

const prisma = new PrismaClient();

const STUDENT_NAMES = [
  { first: 'Aarav', last: 'Sharma', gender: 'MALE' },
  { first: 'Ananya', last: 'Patel', gender: 'FEMALE' },
  { first: 'Rohan', last: 'Verma', gender: 'MALE' },
  { first: 'Priya', last: 'Singh', gender: 'FEMALE' },
  { first: 'Mohammed', last: 'Khan', gender: 'MALE' },
  { first: 'Sneha', last: 'Kulkarni', gender: 'FEMALE' },
  { first: 'Vikram', last: 'Deshmukh', gender: 'MALE' },
  { first: 'Tanvi', last: 'Joshi', gender: 'FEMALE' },
  { first: 'Rahul', last: 'Nair', gender: 'MALE' },
  { first: 'Aditya', last: 'Kulkarni', gender: 'MALE' },
  { first: 'Neha', last: 'Gupta', gender: 'FEMALE' },
  { first: 'Siddharth', last: 'Mehta', gender: 'MALE' },
  { first: 'Pooja', last: 'Reddy', gender: 'FEMALE' },
  { first: 'Ayush', last: 'Choudhury', gender: 'MALE' },
  { first: 'Riya', last: 'Sen', gender: 'FEMALE' },
  { first: 'Kunal', last: 'Kapoor', gender: 'MALE' },
  { first: 'Ishaan', last: 'Malhotra', gender: 'MALE' },
  { first: 'Shreya', last: 'Bhatt', gender: 'FEMALE' },
  { first: 'Varun', last: 'Rao', gender: 'MALE' },
  { first: 'Divya', last: 'Iyer', gender: 'FEMALE' },
  { first: 'Karan', last: 'Joshi', gender: 'MALE' },
  { first: 'Simran', last: 'Kaur', gender: 'FEMALE' },
  { first: 'Nikhil', last: 'Desai', gender: 'MALE' },
  { first: 'Sanya', last: 'Mirza', gender: 'FEMALE' },
  { first: 'Yash', last: 'Singhania', gender: 'MALE' },
  { first: 'Meera', last: 'Nambiar', gender: 'FEMALE' },
  { first: 'Harsh', last: 'Varma', gender: 'MALE' },
  { first: 'Kriti', last: 'Sanon', gender: 'FEMALE' },
  { first: 'Devendra', last: 'Shinde', gender: 'MALE' },
  { first: 'Radhika', last: 'Apte', gender: 'FEMALE' },
  { first: 'Pranav', last: 'Patil', gender: 'MALE' },
  { first: 'Shruti', last: 'Shinde', gender: 'FEMALE' },
  { first: 'Omkar', last: 'Gaikwad', gender: 'MALE' },
  { first: 'Sakshi', last: 'More', gender: 'FEMALE' },
  { first: 'Tejas', last: 'Pawar', gender: 'MALE' },
  { first: 'Mayuri', last: 'Jadhav', gender: 'FEMALE' },
  { first: 'Akshay', last: 'Thorat', gender: 'MALE' },
  { first: 'Rutuja', last: 'Chavan', gender: 'FEMALE' },
  { first: 'Swapnil', last: 'Bhosale', gender: 'MALE' },
  { first: 'Deepali', last: 'Shinde', gender: 'FEMALE' },
  { first: 'Abhishek', last: 'Sawant', gender: 'MALE' },
  { first: 'Snehal', last: 'Kadam', gender: 'FEMALE' },
  { first: 'Gaurav', last: 'Mane', gender: 'MALE' },
  { first: 'Pranali', last: 'Salunkhe', gender: 'FEMALE' },
  { first: 'Tushar', last: 'Jagtap', gender: 'MALE' },
  { first: 'Sayali', last: 'Nikam', gender: 'FEMALE' },
  { first: 'Rohit', last: 'Ghorpade', gender: 'MALE' },
  { first: 'Rohini', last: 'Mohite', gender: 'FEMALE' },
  { first: 'Sagar', last: 'Nalawade', gender: 'MALE' },
  { first: 'Komal', last: 'Tambe', gender: 'FEMALE' },
  { first: 'Chirag', last: 'Shah', gender: 'MALE' },
  { first: 'Disha', last: 'Trivedi', gender: 'FEMALE' },
  { first: 'Hardik', last: 'Pandya', gender: 'MALE' },
  { first: 'Janki', last: 'Dave', gender: 'FEMALE' },
  { first: 'Manan', last: 'Vora', gender: 'MALE' },
  { first: 'Payal', last: 'Doshi', gender: 'FEMALE' },
  { first: 'Ronak', last: 'Mehta', gender: 'MALE' },
  { first: 'Urvi', last: 'Parekh', gender: 'FEMALE' },
  { first: 'Bhavin', last: 'Patel', gender: 'MALE' },
  { first: 'Hetal', last: 'Joshi', gender: 'FEMALE' },
  { first: 'Arjun', last: 'Dasgupta', gender: 'MALE' },
  { first: 'Debolina', last: 'Roy', gender: 'FEMALE' },
  { first: 'Subhashish', last: 'Bose', gender: 'MALE' },
  { first: 'Madhumita', last: 'Sen', gender: 'FEMALE' },
  { first: 'Sourav', last: 'Mukherjee', gender: 'MALE' },
  { first: 'Gargi', last: 'Banerjee', gender: 'FEMALE' },
  { first: 'Anirban', last: 'Bhattacharya', gender: 'MALE' },
  { first: 'Sayani', last: 'Ghosh', gender: 'FEMALE' },
  { first: 'Ritam', last: 'Chakraborty', gender: 'MALE' },
  { first: 'Payel', last: 'Mondal', gender: 'FEMALE' },
  { first: 'Karthik', last: 'Raman', gender: 'MALE' },
  { first: 'Deepika', last: 'Swaminathan', gender: 'FEMALE' },
  { first: 'Arvind', last: 'Subramanian', gender: 'MALE' },
  { first: 'Keerthi', last: 'Suresh', gender: 'FEMALE' },
  { first: 'Vignesh', last: 'Balaji', gender: 'MALE' },
  { first: 'Lavanya', last: 'Sundaram', gender: 'FEMALE' },
  { first: 'Pradeep', last: 'Natarajan', gender: 'MALE' },
  { first: 'Sandhya', last: 'Ramachandran', gender: 'FEMALE' },
  { first: 'Gautham', last: 'Menon', gender: 'MALE' },
  { first: 'Anitha', last: 'Krishnan', gender: 'FEMALE' },
  { first: 'Farhan', last: 'Akhtar', gender: 'MALE' },
  { first: 'Zoya', last: 'Siddiqui', gender: 'FEMALE' },
  { first: 'Bilal', last: 'Ahmed', gender: 'MALE' },
  { first: 'Fatima', last: 'Zahra', gender: 'FEMALE' },
  { first: 'Danish', last: 'Qureshi', gender: 'MALE' },
  { first: 'Sana', last: 'Parveen', gender: 'FEMALE' },
  { first: 'Taha', last: 'Sheikh', gender: 'MALE' },
  { first: 'Alizeh', last: 'Mirza', gender: 'FEMALE' },
  { first: 'Rehan', last: 'Ansari', gender: 'MALE' },
  { first: 'Nida', last: 'Fatima', gender: 'FEMALE' },
  { first: 'Gurpreet', last: 'Singh', gender: 'MALE' },
  { first: 'Jasleen', last: 'Kaur', gender: 'FEMALE' },
  { first: 'Maninder', last: 'Gill', gender: 'MALE' },
  { first: 'Harpreet', last: 'Dhillon', gender: 'FEMALE' },
  { first: 'Navneet', last: 'Sandhu', gender: 'MALE' },
  { first: 'Ravinder', last: 'Brar', gender: 'MALE' },
  { first: 'Simranjit', last: 'Pannu', gender: 'FEMALE' },
  { first: 'Amanpreet', last: 'Bains', gender: 'MALE' },
  { first: 'Jagmeet', last: 'Toor', gender: 'MALE' },
  { first: 'Prabhjot', last: 'Chahal', gender: 'FEMALE' },
];

async function main() {
  console.log('🌱 Starting comprehensive database seed for Zeal College of Engineering and Research (ZCOER)...');

  // 1. Wipe old records safely
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
  await prisma.section.deleteMany({});
  await prisma.batch.deleteMany({});
  await prisma.program.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('🧹 Purged existing records.');

  // Standard Hashed Passwords (bcrypt with 10-12 salt rounds)
  const managementPassword = await bcrypt.hash('Management@123', 12);
  const superAdminPassword = await bcrypt.hash('SuperAdmin@123', 10);
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const facultyPassword = await bcrypt.hash('Faculty@123', 10);
  const studentPassword = await bcrypt.hash('Student@123', 10);
  const disabledPassword = await bcrypt.hash('Disabled@123', 10);

  // 2. Administrative & Management Personas
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
          phone: '+91 2114 667800',
          designation: 'Director of Administration & Operations',
          office: 'Administrative Complex, ZES Induri Campus, Pune',
        },
      },
    },
  });

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
          phone: '+91 20 6720 6001',
          designation: 'Chief Information Officer',
          office: 'Central IT & Systems',
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
          lastName: 'Administrator',
          email: 'admin@zeal.edu.in',
          phone: '+91 20 6720 6002',
          designation: 'Registrar',
          office: 'Office of Academic Affairs',
        },
      },
    },
  });

  // Provision a Disabled Account for automated validation of security constraints
  await prisma.user.create({
    data: {
      email: 'disabled@zeal.edu.in',
      passwordHash: disabledPassword,
      role: 'STUDENT',
      status: 'DISABLED',
    },
  });

  // Also maintain alias for superadmin@college.edu & admin@college.edu
  await prisma.user.create({
    data: {
      email: 'superadmin@college.edu',
      passwordHash: superAdminPassword,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
  });
  await prisma.user.create({
    data: {
      email: 'admin@college.edu',
      passwordHash: adminPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  // 3. Departments
  const cseDept = await prisma.department.create({
    data: {
      code: 'CSE',
      name: 'Computer Engineering',
      description: 'Department of Computer Engineering, AI & Machine Learning',
    },
  });

  const itDept = await prisma.department.create({
    data: {
      code: 'IT',
      name: 'Information Technology',
      description: 'Department of Information Technology, Cloud Computing & Cyber Security',
    },
  });

  const eceDept = await prisma.department.create({
    data: {
      code: 'ENTC',
      name: 'Electronics & Telecommunication',
      description: 'Department of E&TC Engineering, Embedded Systems & IoT',
    },
  });

  const mechDept = await prisma.department.create({
    data: {
      code: 'MECH',
      name: 'Mechanical Engineering',
      description: 'Department of Mechanical Engineering, Robotics & Automation',
    },
  });

  const civilDept = await prisma.department.create({
    data: {
      code: 'CIVIL',
      name: 'Civil Engineering',
      description: 'Department of Civil Engineering & Infrastructure Technology',
    },
  });

  const depts = [cseDept, itDept, eceDept, mechDept, civilDept];

  // 4. Programs, Batches & Sections
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

    const batch = await prisma.batch.create({
      data: {
        programId: prog.id,
        name: 'Batch 2023-2027',
        academicYear: '2024-25',
        startYear: 2023,
        endYear: 2027,
        currentSemester: 3,
      },
    });
    batches.push(batch);

    const secA = await prisma.section.create({
      data: {
        batchId: batch.id,
        name: 'Division A',
        capacity: 60,
        roomNumber: `ZCOER-${dept.code}-201`,
      },
    });

    const secB = await prisma.section.create({
      data: {
        batchId: batch.id,
        name: 'Division B',
        capacity: 60,
        roomNumber: `ZCOER-${dept.code}-202`,
      },
    });

    sections.push(secA, secB);
  }

  // 5. Faculty Members
  const facultyUsers = [
    { email: 'faculty@zeal.edu.in', altEmail: 'faculty@college.edu', name: 'Rajesh Kulkarni', empId: 'FAC-ZCOER-100', deptId: cseDept.id, desig: 'Associate Professor', qual: 'Ph.D in Computer Science' },
    { email: 'turing@zeal.edu.in', altEmail: 'turing@college.edu', name: 'Alan Turing', empId: 'FAC-ZCOER-001', deptId: cseDept.id, desig: 'Professor & HOD', qual: 'Ph.D in Computer Engineering' },
    { email: 'hopper@zeal.edu.in', altEmail: 'hopper@college.edu', name: 'Grace Hopper', empId: 'FAC-ZCOER-002', deptId: cseDept.id, desig: 'Associate Professor', qual: 'Ph.D in Software Systems' },
    { email: 'shannon@zeal.edu.in', altEmail: 'shannon@college.edu', name: 'Claude Shannon', empId: 'FAC-ENTC-001', deptId: eceDept.id, desig: 'Professor & HOD', qual: 'Ph.D in Telecommunications' },
    { email: 'tesla@zeal.edu.in', altEmail: 'tesla@college.edu', name: 'Nikola Tesla', empId: 'FAC-MECH-001', deptId: mechDept.id, desig: 'Professor & HOD', qual: 'Dr. Eng. in Mechanical Systems' },
    { email: 'visvesvaraya@zeal.edu.in', altEmail: 'visvesvaraya@college.edu', name: 'M. Visvesvaraya', empId: 'FAC-CIVIL-001', deptId: civilDept.id, desig: 'Professor & HOD', qual: 'Ph.D in Civil Infrastructure' },
  ];

  const facultyList: any[] = [];
  for (const f of facultyUsers) {
    const user = await prisma.user.create({
      data: {
        email: f.email,
        passwordHash: facultyPassword,
        role: 'FACULTY',
        status: 'ACTIVE',
      },
    });

    const [first, last] = f.name.split(' ');
    const fac = await prisma.faculty.create({
      data: {
        userId: user.id,
        employeeId: f.empId,
        firstName: first,
        lastName: last,
        email: f.email,
        phone: '+91 98220 ' + Math.floor(10000 + Math.random() * 90000),
        designation: f.desig,
        qualification: f.qual,
        departmentId: f.deptId,
        maxWeeklyHours: 18,
      },
    });
    facultyList.push(fac);
  }

  // 6. Subjects & Syllabi
  const dsaSubject = await prisma.subject.create({
    data: {
      code: 'CS301',
      name: 'Data Structures & Algorithms',
      departmentId: cseDept.id,
      semester: 3,
      credits: 4,
      type: 'THEORY',
      maxInternalMarks: 30,
      maxExternalMarks: 70,
      totalMarks: 100,
      syllabusOverview: 'Arrays, Stacks, Queues, Trees, Graphs, Sorting, Hashing, Dynamic Programming',
    },
  });

  const oopSubject = await prisma.subject.create({
    data: {
      code: 'CS302',
      name: 'Object Oriented Programming with Java',
      departmentId: cseDept.id,
      semester: 3,
      credits: 4,
      type: 'THEORY',
      maxInternalMarks: 30,
      maxExternalMarks: 70,
      totalMarks: 100,
      syllabusOverview: 'Classes, Objects, Inheritance, Polymorphism, Interfaces, Exception Handling, Collections',
    },
  });

  const dbmsSubject = await prisma.subject.create({
    data: {
      code: 'CS303',
      name: 'Database Management Systems',
      departmentId: cseDept.id,
      semester: 3,
      credits: 4,
      type: 'THEORY',
      maxInternalMarks: 30,
      maxExternalMarks: 70,
      totalMarks: 100,
      syllabusOverview: 'Relational Model, ER Diagrams, SQL, Normalization, ACID Transactions, Indexing',
    },
  });

  // Assign subjects
  await prisma.facultySubjectAssignment.create({
    data: {
      facultyId: facultyList[0].id,
      subjectId: dsaSubject.id,
      batchId: batches[0].id,
      sectionId: sections[0].id,
      academicSession: '2024-25',
    },
  });

  // 7. Timetable Slots
  const slot1 = await prisma.timetableSlot.create({
    data: {
      dayOfWeek: 'MONDAY',
      startTime: '09:00',
      endTime: '10:00',
      subjectId: dsaSubject.id,
      facultyId: facultyList[0].id,
      sectionId: sections[0].id,
      roomNumber: 'Classroom 201',
      semester: 3,
      academicSession: '2024-25',
    },
  });

  const slot2 = await prisma.timetableSlot.create({
    data: {
      dayOfWeek: 'MONDAY',
      startTime: '10:00',
      endTime: '11:00',
      subjectId: oopSubject.id,
      facultyId: facultyList[1].id,
      sectionId: sections[0].id,
      roomNumber: 'Classroom 201',
      semester: 3,
      academicSession: '2024-25',
    },
  });

  // 8. 10 Lecture Sessions for Attendance Simulation
  const lectureSessions: any[] = [];
  for (let i = 1; i <= 10; i++) {
    const sDate = new Date();
    sDate.setDate(sDate.getDate() - (15 - i));

    const sess = await prisma.lectureSession.create({
      data: {
        timetableSlotId: slot1.id,
        subjectId: dsaSubject.id,
        facultyId: facultyList[0].id,
        sectionId: sections[0].id,
        sessionDate: sDate,
        sessionTime: '09:00 - 10:00',
        topicCovered: `Data Structures Lecture ${i}: Trees & Graph Algorithms (SPPU Syllabus)`,
      },
    });
    lectureSessions.push(sess);
  }

  // 9. Fee Structure
  const feeDueDate = new Date();
  feeDueDate.setDate(feeDueDate.getDate() - 10); // 10 days overdue for testing

  const feePlan = await prisma.feeStructure.create({
    data: {
      name: 'B.E. Academic Year Regular Fee (2024-25)',
      departmentId: cseDept.id,
      programId: programs[0].id,
      semester: 3,
      academicYear: '2024-25',
      dueDate: feeDueDate,
      lateFeePerDay: 50.0,
      totalAmount: 85000.0,
      components: {
        create: [
          { name: 'Tuition Fee (Approved by FRA)', amount: 65000.0 },
          { name: 'Development Fee', amount: 10000.0 },
          { name: 'Laboratory & Internet Fee', amount: 6000.0 },
          { name: 'SPPU Exam & Gymkhana Fee', amount: 4000.0 },
        ],
      },
    },
  });

  // 10. Exam Cycle & Schedule
  const midExam = await prisma.exam.create({
    data: {
      name: 'In-Semester Examination (ISE) 2024',
      examType: 'INTERNAL',
      semester: 3,
      academicYear: '2024-25',
      startDate: new Date('2024-10-10'),
      endDate: new Date('2024-10-22'),
      isPublished: true,
    },
  });

  const examSchDsa = await prisma.examSchedule.create({
    data: {
      examId: midExam.id,
      subjectId: dsaSubject.id,
      examDate: new Date('2024-10-12'),
      startTime: '10:00 AM',
      endTime: '01:00 PM',
      roomNumber: 'Examination Hall 1',
      maxMarks: 100,
    },
  });

  // 11. Create 100 Students with PRN, Roll No, Attendance & Fees
  console.log('🧑‍🎓 Generating 100 students for Zeal College of Engineering...');

  const createdStudents: any[] = [];

  for (let idx = 0; idx < 100; idx++) {
    const rawName = STUDENT_NAMES[idx % STUDENT_NAMES.length];
    const dept = depts[idx % depts.length];
    const prog = programs[idx % programs.length];
    const batch = batches[idx % batches.length];
    const section = sections[idx % sections.length];

    // Standard 10-digit PRN format: 1032230001 - 1032230100 (CAS style)
    const prnNumber = (1032230001 + idx).toString();
    const rollNumber = `ZCOER-${dept.code}-${String(idx + 1).padStart(3, '0')}`;
    const email = `${rawName.first.toLowerCase()}.${rawName.last.toLowerCase()}${idx + 1}@student.zeal.edu.in`;

    // Create User record
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: studentPassword,
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    });

    const birthYear = 2004 + (idx % 3);
    const birthMonth = (idx % 12) + 1;
    const birthDay = (idx % 28) + 1;
    const dob = new Date(`${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`);

    // Create Student record
    const student = await prisma.student.create({
      data: {
        userId: user.id,
        rollNumber,
        enrollmentNumber: prnNumber, // PRN
        firstName: rawName.first,
        lastName: rawName.last,
        email,
        phone: '+91 98' + Math.floor(10000000 + Math.random() * 89999999),
        dateOfBirth: dob,
        gender: rawName.gender,
        bloodGroup: ['A+', 'B+', 'O+', 'AB+', 'O-'][idx % 5],
        address: `${idx + 101}, Zeal Education Society, Induri Campus, Talegaon Dabhade, Pune - 410507`,
        guardianName: `Mr. ${rawName.last}`,
        guardianPhone: '+91 99' + Math.floor(10000000 + Math.random() * 89999999),
        departmentId: dept.id,
        programId: prog.id,
        batchId: batch.id,
        sectionId: section.id,
        currentSemester: 3,
      },
    });

    createdStudents.push(student);

    // Attendance Distribution:
    // ~25 students are attendance DEFAULTERS (< 75%, e.g. 5-7 out of 10)
    // ~75 students have >= 75% attendance (8-10 out of 10)
    const isDefaulter = idx % 4 === 0;
    const attendedCount = isDefaulter ? 5 + (idx % 3) : 8 + (idx % 3);

    for (let sIdx = 0; sIdx < 10; sIdx++) {
      const isPresent = sIdx < attendedCount;
      await prisma.attendanceRecord.create({
        data: {
          lectureSessionId: lectureSessions[sIdx].id,
          studentId: student.id,
          status: isPresent ? 'PRESENT' : 'ABSENT',
        },
      });
    }

    // Fee Ledger Distribution:
    // 0: Full Paid, 1: Partial, 2: Overdue
    const feeType = idx % 3;
    const baseFee = 85000.0;

    let amountPaid = 0;
    let penalty = 0;
    let paymentStatus = 'PENDING';

    if (feeType === 0) {
      amountPaid = baseFee;
      paymentStatus = 'PAID';
    } else if (feeType === 1) {
      amountPaid = 45000.0;
      paymentStatus = 'PARTIALLY_PAID';
    } else {
      amountPaid = 0;
      penalty = 500.0;
      paymentStatus = 'OVERDUE';
    }

    const totalDue = baseFee + penalty;
    const balanceDue = Math.max(0, totalDue - amountPaid);

    const ledger = await prisma.studentFeeLedger.create({
      data: {
        studentId: student.id,
        feeStructureId: feePlan.id,
        invoiceNumber: `INV-ZCOER-2024-S3-${100000 + idx}`,
        baseAmount: baseFee,
        discountAmount: 0.0,
        penaltyAmount: penalty,
        totalDue,
        amountPaid,
        balanceDue,
        paymentStatus,
        dueDate: feeDueDate,
      },
    });

    if (amountPaid > 0) {
      await prisma.feePayment.create({
        data: {
          ledgerId: ledger.id,
          studentId: student.id,
          transactionId: `TXN-ZEAL-${1000000 + idx}`,
          receiptNumber: `REC-ZCOER-2024-${String(idx + 1).padStart(4, '0')}`,
          amount: amountPaid,
          paymentMethod: idx % 2 === 0 ? 'ONLINE' : 'BANK_TRANSFER',
          status: 'COMPLETED',
          notes: 'Zeal College tuition installment.',
        },
      });
    }

    // Exam marks & SGPA
    const intMarks = 18 + (idx % 12);
    const theoMarks = 35 + ((idx * 3) % 35);
    const gradeRes = GradingService.calculateSubjectMarks({
      internalMarks: intMarks,
      theoryMarks: theoMarks,
      credits: 4,
    });

    await prisma.marksEntry.create({
      data: {
        examScheduleId: examSchDsa.id,
        studentId: student.id,
        internalMarks: intMarks,
        theoryMarks: theoMarks,
        totalMarks: gradeRes.totalMarks,
        percentage: gradeRes.percentage,
        letterGrade: gradeRes.letterGrade,
        gradePoint: gradeRes.gradePoint,
        status: gradeRes.status,
      },
    });

    await prisma.studentSemesterResult.create({
      data: {
        studentId: student.id,
        semester: 3,
        totalCredits: 4,
        earnedCredits: gradeRes.status === 'PASS' ? 4 : 0,
        sgpa: gradeRes.gradePoint,
        cgpa: gradeRes.gradePoint,
        resultStatus: gradeRes.status === 'PASS' ? 'PASSED' : 'FAILED',
      },
    });
  }

  // Dedicated Student Account for direct login verification
  const demoStudentUser = await prisma.user.create({
    data: {
      email: 'student@zeal.edu.in',
      passwordHash: studentPassword,
      role: 'STUDENT',
      status: 'ACTIVE',
    },
  });

  await prisma.student.create({
    data: {
      userId: demoStudentUser.id,
      rollNumber: 'ZCOER-CSE-101',
      enrollmentNumber: '1032230101',
      firstName: 'Aditya',
      lastName: 'Kulkarni',
      email: 'student@zeal.edu.in',
      phone: '+91 98220 12345',
      dateOfBirth: new Date('2004-05-15'),
      gender: 'MALE',
      bloodGroup: 'B+',
      address: 'Zeal Education Society, Induri Campus, Talegaon Dabhade, Pune - 410507',
      guardianName: 'Mr. Ramesh Kulkarni',
      guardianPhone: '+91 98220 99999',
      departmentId: cseDept.id,
      programId: programs[0].id,
      batchId: batches[0].id,
      sectionId: sections[0].id,
      currentSemester: 3,
    },
  });

  // 12. Library Books
  const book1 = await prisma.book.create({
    data: {
      isbn: '978-0262033848',
      title: 'Introduction to Algorithms (CLRS)',
      author: 'Thomas H. Cormen, Charles E. Leiserson',
      publisher: 'MIT Press',
      category: 'Computer Engineering',
      edition: '4th',
      totalCopies: 30,
      availableCopies: 25,
      shelfLocation: 'Stack CS-1',
    },
  });

  const book2 = await prisma.book.create({
    data: {
      isbn: '978-0132350884',
      title: 'Clean Code: Agile Software Craftsmanship',
      author: 'Robert C. Martin',
      publisher: 'Prentice Hall',
      category: 'Software Engineering',
      edition: '1st',
      totalCopies: 20,
      availableCopies: 17,
      shelfLocation: 'Stack CS-2',
    },
  });

  // Issue books
  const bDueDate = new Date();
  bDueDate.setDate(bDueDate.getDate() + 14);
  await prisma.bookIssueRecord.create({
    data: {
      bookId: book1.id,
      studentId: createdStudents[0].id,
      dueDate: bDueDate,
      status: 'ISSUED',
    },
  });

  // 13. Institutional Notices
  await prisma.notice.create({
    data: {
      title: 'ZCOER: In-Semester Examination (ISE) Schedule for Term I',
      content:
        'All Second Year B.E. students of Zeal College of Engineering and Research are hereby informed that the ISE will commence from next week. Students with attendance below 75% must meet their Class Teachers.',
      authorId: superAdminUser.id,
      targetRole: 'ALL',
      priority: 'HIGH',
    },
  });

  await prisma.notice.create({
    data: {
      title: 'Zeal Education Society: National Level Technical Symposium "Zeal Drag"',
      content:
        'Registrations are open for the annual national technical symposium at the Induri campus. Project competition, coding sprint, and paper presentation details are available in the department office.',
      authorId: superAdminUser.id,
      targetRole: 'STUDENT',
      priority: 'NORMAL',
    },
  });

  console.log('✅ Seeding completed for Zeal College of Engineering and Research!');
  console.log('   - 100 Students seeded (PRNs: 1032230001 - 1032230100)');
  console.log('   - Credentials: PRN or Email with password "Student@123"');
  console.log('   - Admin: "admin@zeal.edu.in" / "Admin@123"');
  console.log('   - SuperAdmin: "superadmin@zeal.edu.in" / "SuperAdmin@123"');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
