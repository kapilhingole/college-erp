const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const prisma = new PrismaClient();

function parseName(raw, roll) {
  const cleaned = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!cleaned || cleaned.length < 2) {
    return {
      firstName: 'Student',
      lastName: roll,
      fullName: `Student ${roll}`,
    };
  }
  const parts = cleaned.split(' ');
  if (parts.length === 1) {
    return {
      firstName: parts[0],
      lastName: 'Student',
      fullName: cleaned,
    };
  }
  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts[parts.length - 1],
    fullName: cleaned,
  };
}

function cleanPhone(raw, fallbackRoll) {
  const cleaned = String(raw || '').replace(/[^0-9]/g, '');
  if (cleaned.length >= 10) {
    return cleaned.slice(0, 10);
  }
  const numPart = fallbackRoll.replace(/[^0-9]/g, '').padEnd(4, '0');
  return `98765${numPart.slice(-4)}1`;
}

function extractStudentsFromSheet(workbook, sheetName, startRow, endRow, isRightSide, meta) {
  const ws = workbook.Sheets[sheetName];
  if (!ws) {
    console.warn(`Sheet "${sheetName}" not found in workbook!`);
    return [];
  }

  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const list = [];

  const rollCol = isRightSide ? 16 : 1;
  const nameCol = isRightSide ? 17 : 2;
  const phoneCol = isRightSide ? 18 : 3;
  const parentCol = isRightSide ? 19 : 4;
  const gfmCol = isRightSide ? 27 : 11;

  for (let r = startRow; r < endRow && r < rows.length; r++) {
    const row = rows[r] || [];
    const roll = String(row[rollCol] || '').trim().toUpperCase();

    if (!roll.match(/^[A-Z]{2}[0-9]{4}$/)) {
      continue;
    }

    const rawName = String(row[nameCol] || '');
    const { firstName, lastName, fullName } = parseName(rawName, roll);
    const phone = cleanPhone(row[phoneCol], roll);
    const parentPhone = cleanPhone(row[parentCol] || row[phoneCol], roll);
    const gfm = String(row[gfmCol] || '').trim() || null;

    list.push({
      rollNumber: roll,
      fullName,
      firstName,
      lastName,
      phone,
      parentPhone,
      gfm,
      year: meta.year,
      deptCode: meta.deptCode,
      divisionName: meta.divisionName,
      semester: meta.semester,
    });
  }

  return list;
}

async function importDegreeStudents() {
  console.log('===============================================================');
  console.log('🎓 Zeal College of Engineering and Research, Induri Campus, Pune');
  console.log('   Importing FY & SY DEGREE (B.Tech) Students (Excluding Diploma)');
  console.log('===============================================================\n');

  const excelPath = path.resolve(__dirname, '../data/roll_call.xlsx');
  if (!fs.existsSync(excelPath)) {
    throw new Error(`Roll call spreadsheet not found at: ${excelPath}`);
  }

  const workbook = XLSX.readFile(excelPath);
  console.log('Sheets found in file:', workbook.SheetNames);
  console.log('Filtering strictly to: ["Degree -FY ", "Degree-SY"] (Excluding Diploma)\n');

  // 1. Ensure 4 Departments exist
  const deptConfigs = [
    { code: 'COMP', name: 'Computer Engineering' },
    { code: 'AIDS', name: 'Artificial Intelligence and Data Science' },
    { code: 'ENTC', name: 'Electronic and Telecommunication' },
    { code: 'ECE', name: 'Electronic and Computer Engineering' },
  ];

  const departmentMap = new Map();
  for (const cfg of deptConfigs) {
    let dept = await prisma.department.findUnique({ where: { code: cfg.code } });
    if (!dept) {
      dept = await prisma.department.create({
        data: {
          code: cfg.code,
          name: cfg.name,
          description: `Department of ${cfg.name} - ZCOER Induri Campus, Pune`,
        },
      });
    }
    departmentMap.set(cfg.code, dept);
  }

  // 2. Ensure Programs exist for all 4 Departments
  const programMap = new Map();
  for (const [code, dept] of departmentMap.entries()) {
    const progCode = `BE-${code}`;
    let prog = await prisma.program.findUnique({ where: { code: progCode } });
    if (!prog) {
      prog = await prisma.program.create({
        data: {
          code: progCode,
          name: `Bachelor of Engineering in ${dept.name}`,
          departmentId: dept.id,
          degreeType: 'UG',
          totalSemesters: 8,
        },
      });
    }
    programMap.set(code, prog);
  }

  // 3. Ensure Batches exist:
  // FY: Batch 2024-2028 (Semester 1)
  // SY: Batch 2023-2027 (Semester 3)
  const batchMap = new Map();
  for (const [code, prog] of programMap.entries()) {
    // FY Batch
    let fyBatch = await prisma.batch.findFirst({
      where: { programId: prog.id, name: 'Batch 2024-2028' },
    });
    if (!fyBatch) {
      fyBatch = await prisma.batch.create({
        data: {
          name: 'Batch 2024-2028',
          programId: prog.id,
          academicYear: '2024-25',
          startYear: 2024,
          endYear: 2028,
          currentSemester: 1,
        },
      });
    }
    batchMap.set(`${code}_FY`, fyBatch);

    // SY Batch
    let syBatch = await prisma.batch.findFirst({
      where: { programId: prog.id, name: 'Batch 2023-2027' },
    });
    if (!syBatch) {
      syBatch = await prisma.batch.create({
        data: {
          name: 'Batch 2023-2027',
          programId: prog.id,
          academicYear: '2024-25',
          startYear: 2023,
          endYear: 2027,
          currentSemester: 3,
        },
      });
    }
    batchMap.set(`${code}_SY`, syBatch);
  }

  // 4. Ensure Sections exist under each Batch
  const sectionMap = new Map();
  for (const [key, batch] of batchMap.entries()) {
    const [deptCode] = key.split('_');
    let divisionNames = [];
    if (deptCode === 'COMP') divisionNames = ['Division A', 'Division B'];
    else if (deptCode === 'AIDS') divisionNames = ['Division C', 'Division D'];
    else if (deptCode === 'ECE') divisionNames = ['Division E'];
    else if (deptCode === 'ENTC') divisionNames = ['Division F'];

    for (const divName of divisionNames) {
      let sec = await prisma.section.findFirst({
        where: { batchId: batch.id, name: divName },
      });
      if (!sec) {
        sec = await prisma.section.create({
          data: {
            batchId: batch.id,
            name: divName,
            capacity: 80,
            roomNumber: `${deptCode} Room ${divName.slice(-1)}`,
          },
        });
      }
      sectionMap.set(`${batch.id}_${divName}`, sec);
    }
  }

  // 5. Parse ONLY Degree FY & SY sheets
  const allStudents = [
    // FY BTech
    ...extractStudentsFromSheet(workbook, 'Degree -FY ', 4, 68, false, { year: 'FY', deptCode: 'COMP', divisionName: 'Division A', semester: 1 }),
    ...extractStudentsFromSheet(workbook, 'Degree -FY ', 4, 68, true, { year: 'FY', deptCode: 'COMP', divisionName: 'Division B', semester: 1 }),
    ...extractStudentsFromSheet(workbook, 'Degree -FY ', 72, 139, false, { year: 'FY', deptCode: 'AIDS', divisionName: 'Division C', semester: 1 }),
    ...extractStudentsFromSheet(workbook, 'Degree -FY ', 72, 139, true, { year: 'FY', deptCode: 'AIDS', divisionName: 'Division D', semester: 1 }),
    ...extractStudentsFromSheet(workbook, 'Degree -FY ', 143, 200, false, { year: 'FY', deptCode: 'ECE', divisionName: 'Division E', semester: 1 }),
    ...extractStudentsFromSheet(workbook, 'Degree -FY ', 143, 200, true, { year: 'FY', deptCode: 'ENTC', divisionName: 'Division F', semester: 1 }),

    // SY BTech
    ...extractStudentsFromSheet(workbook, 'Degree-SY', 4, 94, false, { year: 'SY', deptCode: 'COMP', divisionName: 'Division A', semester: 3 }),
    ...extractStudentsFromSheet(workbook, 'Degree-SY', 4, 94, true, { year: 'SY', deptCode: 'COMP', divisionName: 'Division B', semester: 3 }),
    ...extractStudentsFromSheet(workbook, 'Degree-SY', 98, 183, false, { year: 'SY', deptCode: 'AIDS', divisionName: 'Division C', semester: 3 }),
    ...extractStudentsFromSheet(workbook, 'Degree-SY', 98, 183, true, { year: 'SY', deptCode: 'AIDS', divisionName: 'Division D', semester: 3 }),
    ...extractStudentsFromSheet(workbook, 'Degree-SY', 187, 280, false, { year: 'SY', deptCode: 'ECE', divisionName: 'Division E', semester: 3 }),
    ...extractStudentsFromSheet(workbook, 'Degree-SY', 187, 280, true, { year: 'SY', deptCode: 'ENTC', divisionName: 'Division F', semester: 3 }),
  ];

  console.log(`📋 Total Degree students extracted: ${allStudents.length}`);
  const fyCount = allStudents.filter((s) => s.year === 'FY').length;
  const syCount = allStudents.filter((s) => s.year === 'SY').length;
  console.log(`   - FY (First Year Degree): ${fyCount} students`);
  console.log(`   - SY (Second Year Degree): ${syCount} students`);
  console.log(`   - Diploma students: 0 (Excluded completely as instructed)\n`);

  // Default student password
  const defaultPasswordHash = await bcrypt.hash('Student@123', 10);

  let insertedCount = 0;
  let updatedCount = 0;

  for (const s of allStudents) {
    const dept = departmentMap.get(s.deptCode);
    const prog = programMap.get(s.deptCode);
    const batch = batchMap.get(`${s.deptCode}_${s.year}`);
    const section = sectionMap.get(`${batch.id}_${s.divisionName}`);

    const email = `${s.rollNumber.toLowerCase()}.${s.year.toLowerCase()}@zeal.edu.in`;
    const yearPrefix = s.year === 'FY' ? '24' : '23';
    const enrollmentNumber = `ZCOER${yearPrefix}${s.rollNumber}`;

    // Upsert User
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          passwordHash: defaultPasswordHash,
          role: 'STUDENT',
          status: 'ACTIVE',
        },
      });
    }

    // Upsert Student
    const existingStudent = await prisma.student.findFirst({
      where: {
        rollNumber: s.rollNumber,
        batchId: batch.id,
      },
    });

    const defaultDob = s.year === 'FY' ? new Date('2006-06-15') : new Date('2005-06-15');

    if (existingStudent) {
      await prisma.student.update({
        where: { id: existingStudent.id },
        data: {
          firstName: s.firstName,
          lastName: s.lastName,
          phone: s.phone,
          guardianPhone: s.parentPhone,
          currentSemester: s.semester,
          sectionId: section ? section.id : null,
          academicStatus: 'ACTIVE',
        },
      });
      updatedCount++;
    } else {
      await prisma.student.create({
        data: {
          userId: user.id,
          rollNumber: s.rollNumber,
          enrollmentNumber,
          firstName: s.firstName,
          lastName: s.lastName,
          email,
          phone: s.phone,
          guardianName: s.gfm ? `GFM: ${s.gfm}` : 'Parent/Guardian',
          guardianPhone: s.parentPhone,
          dateOfBirth: defaultDob,
          gender: 'MALE',
          academicStatus: 'ACTIVE',
          currentSemester: s.semester,
          departmentId: dept.id,
          programId: prog.id,
          batchId: batch.id,
          sectionId: section ? section.id : null,
        },
      });
      insertedCount++;
    }
  }

  console.log(`\n🎉 Import Complete!`);
  console.log(`   - Newly Inserted: ${insertedCount}`);
  console.log(`   - Existing Updated: ${updatedCount}`);
  console.log(`   - Total Active Degree Students in Database: ${insertedCount + updatedCount}`);

  console.log('\n📊 Departmental Breakdown:');
  for (const cfg of deptConfigs) {
    const deptStudents = allStudents.filter((s) => s.deptCode === cfg.code);
    const fyDept = deptStudents.filter((s) => s.year === 'FY').length;
    const syDept = deptStudents.filter((s) => s.year === 'SY').length;
    console.log(`   - ${cfg.code} (${cfg.name}): ${deptStudents.length} total (FY: ${fyDept}, SY: ${syDept})`);
  }
}

module.exports = { importDegreeStudents };

if (require.main === module) {
  importDegreeStudents()
    .then(() => prisma.$disconnect())
    .catch((err) => {
      console.error('❌ Ingestion failed:', err);
      prisma.$disconnect();
      process.exit(1);
    });
}

