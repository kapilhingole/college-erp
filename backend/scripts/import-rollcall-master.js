/**
 * Load data/students_master.json (built by build-rollcall-master.js) into the ERP database.
 *
 * The import is idempotent: users and students are matched by email, so re-running it
 * refreshes names, division/section, batch and staff details without creating duplicates.
 * New students added to the master are created automatically, and any missing
 * department / program / batch / section is created on demand - so adding students in
 * any department just works.
 *
 * Usage:
 *   node scripts/import-rollcall-master.js           # create + update
 *   node scripts/import-rollcall-master.js --prune   # also delete DB students that are
 *                                                    # no longer present in the master
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const MASTER_PATH = path.resolve(__dirname, '../../data/students_master.json');
const PRUNE = process.argv.includes('--prune');

// Master department code -> database department (the app uses COMP, not CO).
const DEPARTMENTS = {
  CO: { code: 'COMP', name: 'Computer Engineering', program: 'BE-COMP' },
  AIDS: { code: 'AIDS', name: 'Artificial Intelligence and Data Science', program: 'BE-AIDS' },
  ECE: { code: 'ECE', name: 'Electronic and Computer Engineering', program: 'BE-ECE' },
  ENTC: { code: 'ENTC', name: 'Electronic and Telecommunication', program: 'BE-ENTC' },
};

const YEARS = {
  FY: { semester: 1, batchName: 'Batch 2024-2028', startYear: 2024, endYear: 2028, academicYear: '2024-25', enrollPrefix: '24', dob: '2006-06-15' },
  SY: { semester: 3, batchName: 'Batch 2023-2027', startYear: 2023, endYear: 2027, academicYear: '2024-25', enrollPrefix: '23', dob: '2005-06-15' },
};

function splitName(fullName, roll) {
  const cleaned = String(fullName || '').replace(/\s+/g, ' ').trim();
  if (cleaned.length < 2) return { firstName: 'Student', lastName: roll };
  const parts = cleaned.split(' ');
  if (parts.length === 1) return { firstName: parts[0], lastName: 'Student' };
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts.slice(-1)[0] };
}

function phoneFor(roll, salt) {
  const digits = roll.replace(/[^0-9]/g, '').padEnd(4, '0');
  return `98${salt}${digits.slice(-4)}${(roll.charCodeAt(roll.length - 1) % 9) + 1}`;
}

async function ensureDepartment(key) {
  const cfg = DEPARTMENTS[key];
  return prisma.department.upsert({
    where: { code: cfg.code },
    update: {},
    create: {
      code: cfg.code,
      name: cfg.name,
      description: `Department of ${cfg.name} - ZCOER Induri Campus, Pune`,
    },
  });
}

async function ensureProgram(dept, key) {
  const cfg = DEPARTMENTS[key];
  return prisma.program.upsert({
    where: { code: cfg.program },
    update: {},
    create: {
      code: cfg.program,
      name: `Bachelor of Engineering in ${dept.name}`,
      departmentId: dept.id,
      degreeType: 'UG',
      totalSemesters: 8,
    },
  });
}

async function ensureBatch(program, yearCfg) {
  const existing = await prisma.batch.findFirst({
    where: { programId: program.id, name: yearCfg.batchName },
  });
  if (existing) return existing;
  return prisma.batch.create({
    data: {
      name: yearCfg.batchName,
      programId: program.id,
      academicYear: yearCfg.academicYear,
      startYear: yearCfg.startYear,
      endYear: yearCfg.endYear,
      currentSemester: yearCfg.semester,
    },
  });
}

async function ensureSection(batch, letter, deptCode) {
  const name = `Division ${letter}`;
  const existing = await prisma.section.findFirst({ where: { batchId: batch.id, name } });
  if (existing) return existing;
  return prisma.section.create({
    data: { batchId: batch.id, name, capacity: 80, roomNumber: `${deptCode} Room ${letter}` },
  });
}

async function main() {
  if (!fs.existsSync(MASTER_PATH)) {
    throw new Error(`Master file not found: ${MASTER_PATH}. Run build-rollcall-master.js first.`);
  }
  const master = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf8'));

  console.log('===============================================================');
  console.log('  Loading roll-call master into the ERP database');
  console.log(`  Source : ${MASTER_PATH}`);
  console.log(`  Mode   : ${PRUNE ? 'create + update + prune' : 'create + update'}`);
  console.log('===============================================================\n');

  const passwordHash = await bcrypt.hash('Student@123', 10);

  // Pre-create departments, programs, batches and sections.
  const deptMap = {};
  const programMap = {};
  const batchMap = {};
  const sectionMap = {};

  for (const key of Object.keys(DEPARTMENTS)) {
    const dept = await ensureDepartment(key);
    deptMap[key] = dept;
    const program = await ensureProgram(dept, key);
    programMap[key] = program;
    for (const year of Object.keys(YEARS)) {
      const batch = await ensureBatch(program, YEARS[year]);
      batchMap[`${key}_${year}`] = batch;
    }
  }

  const expected = new Set();
  const seenEmails = new Set();
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const byDept = {};

  for (const [key, dept] of Object.entries(master.departments)) {
    if (!DEPARTMENTS[key]) {
      console.warn(`  ! Unknown department "${key}" in master - skipped.`);
      continue;
    }
    for (const [yearKey, yearCfg] of [['fy', 'FY'], ['sy', 'SY']]) {
      const cfg = YEARS[yearCfg];
      for (const [letter, division] of Object.entries(dept[yearKey].divisions)) {
        const batch = batchMap[`${key}_${yearCfg}`];
        const sectionKey = `${key}_${yearCfg}_${letter}`;
        if (!sectionMap[sectionKey]) {
          sectionMap[sectionKey] = await ensureSection(batch, letter, DEPARTMENTS[key].code);
        }
        const section = sectionMap[sectionKey];
        if (!byDept[key]) byDept[key] = { fy: 0, sy: 0 };

        // GFM teacher per practical batch, so guardianName stays in sync with the sheet.
        const gfmByBatch = {};
        for (const [batchCode, batchInfo] of Object.entries(division.batches || {})) {
          if (batchInfo.gfm_teacher && batchInfo.gfm_teacher.name) {
            gfmByBatch[batchCode] = batchInfo.gfm_teacher.name;
          }
        }

        for (const student of division.students) {
          const email = `${student.roll_no.toLowerCase()}.${yearCfg.toLowerCase()}@zeal.edu.in`;
          if (seenEmails.has(email)) {
            skipped += 1;
            continue;
          }
          seenEmails.add(email);
          expected.add(`${student.roll_no}|${cfg.semester}`);

          const { firstName, lastName } = splitName(student.name, student.roll_no);
          const gfm = gfmByBatch[student.batch] || null;

          const user = await prisma.user.upsert({
            where: { email },
            update: { role: 'STUDENT', status: 'ACTIVE' },
            create: { email, passwordHash, role: 'STUDENT', status: 'ACTIVE' },
          });

          const payload = {
            firstName,
            lastName,
            rollNumber: student.roll_no,
            currentSemester: cfg.semester,
            guardianName: gfm ? `GFM: ${gfm}` : 'Parent/Guardian',
            guardianPhone: phoneFor(student.roll_no, '2'),
            phone: phoneFor(student.roll_no, '1'),
            academicStatus: 'ACTIVE',
            departmentId: deptMap[key].id,
            programId: programMap[key].id,
            batchId: batch.id,
            sectionId: section.id,
          };

          const existing = await prisma.student.findUnique({ where: { email } });
          if (existing) {
            await prisma.student.update({ where: { email }, data: payload });
            updated += 1;
          } else {
            await prisma.student.create({
              data: {
                ...payload,
                userId: user.id,
                email,
                enrollmentNumber: `ZCOER${cfg.enrollPrefix}${student.roll_no}`,
                dateOfBirth: new Date(cfg.dob),
                gender: 'MALE',
              },
            });
            created += 1;
          }
          byDept[key][yearKey] += 1;
        }
      }
    }
  }

  console.log(`  Inserted : ${created}`);
  console.log(`  Updated  : ${updated}`);
  if (skipped) console.log(`  Skipped  : ${skipped} (duplicate email in master)`);

  // Report (and optionally remove) rows that the master no longer contains.
  const dbStudents = await prisma.student.findMany({
    select: { id: true, email: true, rollNumber: true, currentSemester: true },
  });
  const stale = dbStudents.filter((s) => !expected.has(`${s.rollNumber}|${s.currentSemester}`));
  if (stale.length) {
    console.log(`\n  Master-driven rows not in the master: ${stale.length}`);
    stale.forEach((s) => console.log(`    - ${s.rollNumber} (sem ${s.currentSemester}) ${s.email}`));
    if (PRUNE) {
      let removed = 0;
      for (const s of stale) {
        try {
          await prisma.student.delete({ where: { id: s.id } });
          await prisma.user.deleteMany({ where: { email: s.email } });
          removed += 1;
        } catch (err) {
          console.warn(`    ! could not remove ${s.email}: ${err.message}`);
        }
      }
      console.log(`  Removed  : ${removed}`);
    } else {
      console.log('  (re-run with --prune to remove them)');
    }
  }

  console.log('\n  Department totals now:');
  for (const [key, counts] of Object.entries(byDept)) {
    console.log(`    ${DEPARTMENTS[key].code.padEnd(5)} FY ${counts.fy}  SY ${counts.sy}  = ${counts.fy + counts.sy}`);
  }

  const total = await prisma.student.count();
  console.log(`\n  Total students in database: ${total}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error('Import failed:', err);
    await prisma.$disconnect();
    process.exit(1);
  });
