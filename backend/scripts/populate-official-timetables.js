/**
 * Populate Official ZCOER FY and SY B.Tech Timetables (AY 2026-2027)
 * Strictly matches the official timetable PDFs provided by ZCOER:
 * 1. FY B.Tech (SEM: I) - Record No: ZCOER-ACAD/R/14A
 * 2. SY B.Tech (SEM: III) - Record No: ZCOER-ACAD/R/14A
 */

process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:c:/Users/LENOVO/OneDrive/Desktop/College ERP/backend/prisma/erp.db';
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting official Timetable population for FY and SY B.Tech (AY 2026-27)...');

  // 1. Fetch departments
  const depts = await prisma.department.findMany();
  const deptMap = Object.fromEntries(depts.map((d) => [d.code, d.id]));

  if (!deptMap['COMP'] || !deptMap['AIDS'] || !deptMap['ECE'] || !deptMap['ENTC']) {
    throw new Error('Required departments missing. Ensure COMP, AIDS, ECE, ENTC exist.');
  }

  // 2. Fetch sections
  const sections = await prisma.section.findMany({
    include: {
      batch: {
        include: {
          program: {
            include: { department: true }
          }
        }
      }
    }
  });

  // Group sections by Year and Division
  // FY is Batch 2024-2028 (currentSemester: 1), SY is Batch 2023-2027 (currentSemester: 3)
  const secLookup = {};
  for (const s of sections) {
    const yr = s.batch.currentSemester === 1 || s.batch.name.includes('2024') ? 'FY' : 'SY';
    const dept = s.batch.program.department.code;
    const div = s.name; // e.g. "Division A", "Division B", etc.
    const key = `${yr}_${dept}_${div}`;
    secLookup[key] = s.id;
  }
  console.log('Registered Section Keys:', Object.keys(secLookup));

  // 3. Fetch faculty
  const allFaculty = await prisma.faculty.findMany();
  const facByEmp = Object.fromEntries(allFaculty.map((f) => [f.employeeId, f.id]));
  const facByName = {};
  for (const f of allFaculty) {
    const fullName = `${f.firstName} ${f.lastName}`.toLowerCase();
    facByName[fullName] = f.id;
  }

  // Faculty Initial Mapping
  const initialMap = {
    CH: facByEmp['FAC-ZCOER-035'], // Chetan Harak
    PP: facByEmp['FAC-ZCOER-002'], // Priti Pande
    KD: facByEmp['FAC-ZCOER-036'], // Krushnat Dubal
    SK: facByEmp['FAC-ZCOER-027'], // Sachin Kadam
    SD: facByEmp['FAC-ZCOER-014'] || facByEmp['FAC-ZCOER-012'], // Snehal Dharme / Swapnali Deshmukh
    NL: facByEmp['FAC-ZCOER-033'], // Nitesh Lad
    SM: facByEmp['FAC-ZCOER-019'] || facByEmp['FAC-ZCOER-026'], // Shrutika More
    MG: facByEmp['FAC-ZCOER-008'], // Mahima Gamot
    VJ: facByEmp['FAC-ZCOER-040'], // Vishnu Jadhav
    NC: facByEmp['FAC-ZCOER-037'], // Nirmala Chede
    RB: facByEmp['FAC-ZCOER-015'], // Rashmi Bhumbare
    MP: facByEmp['FAC-ZCOER-016'], // Mahesh Patil
    SA: facByEmp['FAC-ZCOER-005'], // Sayali Ambole
    NW: facByEmp['FAC-ZCOER-031'], // N. Walunjkar
    VN: facByEmp['FAC-ZCOER-006'], // Vaibhav Nema
    MN: facByEmp['FAC-ZCOER-038'], // Mayur Narawade
    VS: facByEmp['FAC-ZCOER-018'], // Vedant Sharma
    SP: facByEmp['FAC-ZCOER-030'] || facByEmp['FAC-ZCOER-032'], // Sandeep Pawar / Seema Patil
    RT: facByEmp['FAC-ZCOER-017'], // Rakhi Tarone
    BS: facByEmp['FAC-ZCOER-013'], // Bhasker Singh
    SC: facByEmp['FAC-ZCOER-029'] || facByEmp['FAC-ZCOER-021'], // Suhas Chavan / Samrudhi Pachpinde
    PB: facByEmp['FAC-ZCOER-020'], // Priyanka Bahirwade
    KK: facByEmp['FAC-ZCOER-011'], // Kiran Kalokhe
    SVM: facByEmp['FAC-ZCOER-026'], // Shivam More
    YC: facByEmp['FAC-ZCOER-023'], // Yogita Chaskar
    AB: facByEmp['FAC-ZCOER-009'], // Aparna Bhat
    JJ: facByEmp['FAC-ZCOER-034'], // Jyoti Jadhav
    TS: facByEmp['FAC-ZCOER-003'], // Tejashree Sutar
    SG: facByEmp['FAC-ZCOER-001'], // Sachin Godase
    GD: facByEmp['FAC-ZCOER-025'], // Gauri Deshmukh
    VK: facByEmp['FAC-ZCOER-040'] || facByEmp['FAC-ZCOER-027'], // Vishnu Jadhav / Kadam
    TP: facByEmp['FAC-ZCOER-039'] || facByEmp['FAC-ZCOER-001'], // Gauri Shiwale / Training & Placement
  };

  // 4. Ensure Subjects exist
  const subjectsToEnsure = [
    // FY Subjects (Semester 1)
    { code: 'FE101', name: 'Engineering Chemistry (ECM)', sem: 1, deptId: deptMap['COMP'], type: 'THEORY' },
    { code: 'FE102', name: 'Engineering Mechanics - I (EM-I)', sem: 1, deptId: deptMap['COMP'], type: 'THEORY' },
    { code: 'FE103', name: 'Basic Electrical & Electronics (BEEE)', sem: 1, deptId: deptMap['COMP'], type: 'THEORY' },
    { code: 'FE104', name: 'Problem Solving & Logic Building (PS&LB)', sem: 1, deptId: deptMap['COMP'], type: 'THEORY' },
    { code: 'FE105', name: 'Web Application Development (WAD)', sem: 1, deptId: deptMap['COMP'], type: 'THEORY' },
    { code: 'FE106', name: 'Linear Algebra & Calculus (LA & DC)', sem: 1, deptId: deptMap['AIDS'], type: 'THEORY' },
    { code: 'FE107', name: 'Professional Development - I (PD-I)', sem: 1, deptId: deptMap['COMP'], type: 'THEORY' },
    { code: 'FE108', name: 'Information Technology Practices (ITP)', sem: 1, deptId: deptMap['ECE'], type: 'THEORY' },
    { code: 'FE109', name: 'Electronic Circuit Design (ECD)', sem: 1, deptId: deptMap['ENTC'], type: 'THEORY' },
    { code: 'FE110', name: 'Engineering Physics (EP)', sem: 1, deptId: deptMap['ECE'], type: 'THEORY' },
    { code: 'FE111', name: 'Indian Knowledge Systems (IKS)', sem: 1, deptId: deptMap['COMP'], type: 'THEORY' },
    { code: 'FE112', name: 'Liberal Learning - I', sem: 1, deptId: deptMap['COMP'], type: 'THEORY' },
    { code: 'FE113', name: 'Library / Group Discussion / GFM', sem: 1, deptId: deptMap['COMP'], type: 'TUTORIAL' },

    // SY Subjects (Semester 3)
    { code: 'CS301', name: 'Data Structures & Algorithms (DS)', sem: 3, deptId: deptMap['COMP'], type: 'THEORY' },
    { code: 'CS302', name: 'Object Oriented Programming with Java', sem: 3, deptId: deptMap['COMP'], type: 'THEORY' },
    { code: 'CS304', name: 'Principles of Advanced Software Development (PASD)', sem: 3, deptId: deptMap['COMP'], type: 'THEORY' },
    { code: 'CS306', name: 'Discrete Mathematics (DM)', sem: 3, deptId: deptMap['COMP'], type: 'THEORY' },
    { code: 'AI302', name: 'Discrete Mathematics & Statistical Methods (DM & SM)', sem: 3, deptId: deptMap['AIDS'], type: 'THEORY' },
    { code: 'AI301', name: 'Statistics for Artificial Intelligence (SAI)', sem: 3, deptId: deptMap['AIDS'], type: 'THEORY' },
    { code: 'AI304', name: 'Computer Graphics (CG)', sem: 3, deptId: deptMap['AIDS'], type: 'THEORY' },
    { code: 'AI305', name: 'Object Oriented Programming with C++', sem: 3, deptId: deptMap['AIDS'], type: 'THEORY' },
    { code: 'AI307', name: 'Python Programming Lab', sem: 3, deptId: deptMap['AIDS'], type: 'LAB' },
    { code: 'EC302', name: 'Computer Organization & Architecture (COA)', sem: 3, deptId: deptMap['ECE'], type: 'THEORY' },
    { code: 'EC303', name: 'Engineering Mathematics - III (EM-III)', sem: 3, deptId: deptMap['ECE'], type: 'THEORY' },
    { code: 'EC304', name: 'Digital Electronics & Microprocessors (DEM)', sem: 3, deptId: deptMap['ECE'], type: 'THEORY' },
    { code: 'ET301', name: 'Network Analysis & Synthesis (NAS)', sem: 3, deptId: deptMap['ENTC'], type: 'THEORY' },
    { code: 'ET304', name: 'Fundamentals of C Programming (FOCP)', sem: 3, deptId: deptMap['ENTC'], type: 'THEORY' },
    { code: 'ET305', name: 'Data Structures & Data Analysis (DSDA)', sem: 3, deptId: deptMap['ENTC'], type: 'THEORY' },
    { code: 'OE301', name: 'Open Elective - I (OE - 1)', sem: 3, deptId: deptMap['COMP'], type: 'THEORY' },
    { code: 'PST301', name: 'Professional Skills Training - I (PST-I)', sem: 3, deptId: deptMap['ENTC'], type: 'LAB' },
    { code: 'PBL301', name: 'Project Based Learning (PBL)', sem: 3, deptId: deptMap['COMP'], type: 'LAB' },
    { code: 'WS301', name: 'Electronic / Electrical Workshop', sem: 3, deptId: deptMap['ECE'], type: 'LAB' },
    { code: 'LL301', name: 'Liberal Learning - III', sem: 3, deptId: deptMap['COMP'], type: 'THEORY' },
    { code: 'TP301', name: 'Library / GD / Training & Placement', sem: 3, deptId: deptMap['COMP'], type: 'TUTORIAL' },
    { code: 'GFM301', name: 'Guardian Faculty Member (GFM) Mentoring', sem: 3, deptId: deptMap['COMP'], type: 'TUTORIAL' },
    { code: 'CIE301', name: 'CIE-II Activity Submission', sem: 3, deptId: deptMap['ECE'], type: 'THEORY' },
  ];

  const subMap = {};
  for (const s of subjectsToEnsure) {
    const existing = await prisma.subject.findFirst({
      where: { code: s.code },
    });
    if (existing) {
      subMap[s.code] = existing.id;
    } else {
      const created = await prisma.subject.create({
        data: {
          code: s.code,
          name: s.name,
          departmentId: s.deptId,
          semester: s.sem,
          credits: s.type === 'LAB' ? 2 : 4,
          type: s.type,
          maxInternalMarks: 30,
          maxExternalMarks: 70,
          totalMarks: 100,
        },
      });
      subMap[s.code] = created.id;
    }
  }

  // Helper alias to resolve subject codes easily
  const getSubId = (text) => {
    const t = text.toUpperCase().trim();
    if (t.includes('ECM') || t.includes('CHEM')) return subMap['FE101'];
    if (t.includes('EM-I') && !t.includes('EM-III')) return subMap['FE102'];
    if (t.includes('BEEE') || t.includes('BEE-')) return subMap['FE103'];
    if (t.includes('PS &LB') || t.includes('PS&LB')) return subMap['FE104'];
    if (t.includes('WAD')) return subMap['FE105'];
    if (t.includes('LA & DC')) return subMap['FE106'];
    if (t.includes('PD-I') || t.includes('PD-1')) return subMap['FE107'];
    if (t.includes('ITP')) return subMap['FE108'];
    if (t.includes('ECD')) return subMap['FE109'];
    if (t.includes('EP')) return subMap['FE110'];
    if (t.includes('IKS')) return subMap['FE111'];
    if (t.includes('LIBERAL LEARNING-III') || t.includes('LIBERAL LEARNING - III')) return subMap['LL301'];
    if (t.includes('LIBERAL LEARNING')) return subMap['FE112'];
    if (t.includes('JAVA')) return subMap['CS302'];
    if (t.includes('PASD')) return subMap['CS304'];
    if (t.includes('DM & SM') || t.includes('DM&SM')) return subMap['AI302'];
    if (t.includes('DM') && !t.includes('DEM')) return subMap['CS306'];
    if (t.includes('SAI')) return subMap['AI301'];
    if (t.includes('CG')) return subMap['AI304'];
    if (t.includes('C++')) return subMap['AI305'];
    if (t.includes('PYTHON')) return subMap['AI307'];
    if (t.includes('COA')) return subMap['EC302'];
    if (t.includes('EM-III')) return subMap['EC303'];
    if (t.includes('DEM') || t.includes('DFM')) return subMap['EC304'];
    if (t.includes('NAS')) return subMap['ET301'];
    if (t.includes('FOCP')) return subMap['ET304'];
    if (t.includes('DSDA')) return subMap['ET305'];
    if (t.includes('OE - 1') || t.includes('OE-1')) return subMap['OE301'];
    if (t.includes('PST-I') || t.includes('PST')) return subMap['PST301'];
    if (t.includes('PBL')) return subMap['PBL301'];
    if (t.includes('WORKSHOP')) return subMap['WS301'];
    if (t.includes('CIE-II') || t.includes('CIE')) return subMap['CIE301'];
    if (t.includes('GFM')) return subMap['GFM301'];
    if (t.includes('LIBRARY') || t.includes('T&P')) return subMap['TP301'];
    if (t.includes('DSA') || t.includes('DS')) return subMap['CS301'];
    return subMap['FE101'];
  };

  // 5. Clean wipe any existing slots so that only authentic records exist
  await prisma.lectureSession.deleteMany({});
  await prisma.timetableSlot.deleteMany({});
  console.log('🧹 Purged existing timetable slots for pristine update.');

  // Array of all slots from the 2 PDFs
  const rawSlots = [];

  // Helper function to register slots
  function addSlot(year, day, divKey, startTime, endTime, subjStr, facInitial, room, slotType, batchLabel = null) {
    const sectionId = secLookup[divKey];
    if (!sectionId) {
      console.warn(`Section not found for ${divKey}`);
      return;
    }
    const subjectId = getSubId(subjStr);
    const facultyId = initialMap[facInitial] || allFaculty[0].id;

    rawSlots.push({
      yearLabel: year,
      dayOfWeek: day,
      sectionId,
      divisionLabel: divKey.split('_')[2], // e.g. "Division A"
      startTime,
      endTime,
      subjectId,
      facultyId,
      roomNumber: room || 'A1-02',
      semester: year === 'FY' ? 1 : 3,
      academicSession: '2026-27',
      slotType: slotType || 'LECTURE',
      batchLabel: batchLabel || 'ALL',
    });
  }

  // =========================================================================
  // SCHEDULE DEFINITION FOR FY B.TECH (SEM: I)
  // =========================================================================

  // --- FY MONDAY ---
  // Comp Div A
  addSlot('FY', 'MONDAY', 'FY_COMP_Division A', '09:15', '10:15', 'ECM', 'CH', 'A1-03', 'LECTURE');
  addSlot('FY', 'MONDAY', 'FY_COMP_Division A', '10:15', '11:15', 'EM-I', 'PP', 'A1-03', 'LECTURE');
  addSlot('FY', 'MONDAY', 'FY_COMP_Division A', '11:30', '12:30', 'BEEE', 'KD', 'A1-03', 'LECTURE');
  addSlot('FY', 'MONDAY', 'FY_COMP_Division A', '13:30', '14:30', 'PS&LB', 'SK', 'A1-04', 'LECTURE');
  addSlot('FY', 'MONDAY', 'FY_COMP_Division A', '14:30', '15:30', 'BEEE', 'KD', 'A1-03', 'LECTURE');

  // Comp Div B
  addSlot('FY', 'MONDAY', 'FY_COMP_Division B', '09:15', '11:15', 'BEEE', 'SD', 'A1-04', 'LAB', 'B1');
  addSlot('FY', 'MONDAY', 'FY_COMP_Division B', '09:15', '11:15', 'WAD', 'MN', 'A0-30', 'LAB', 'B2');
  addSlot('FY', 'MONDAY', 'FY_COMP_Division B', '11:30', '12:30', 'PS&LB', 'SK', 'A1-04', 'LECTURE');
  addSlot('FY', 'MONDAY', 'FY_COMP_Division B', '13:30', '15:30', 'LIBERAL LEARNING', 'SC', 'A1-04', 'LECTURE');

  // AI DS Div C
  addSlot('FY', 'MONDAY', 'FY_AIDS_Division C', '09:15', '11:15', 'BEEE', 'SD', 'A0-21', 'LAB', 'C1');
  addSlot('FY', 'MONDAY', 'FY_AIDS_Division C', '09:15', '11:15', 'WAD', 'NL', 'A1-20', 'LAB', 'C2');
  addSlot('FY', 'MONDAY', 'FY_AIDS_Division C', '11:30', '12:30', 'BEEE', 'SD', 'A1-16', 'LECTURE');
  addSlot('FY', 'MONDAY', 'FY_AIDS_Division C', '13:30', '14:30', 'WAD', 'NL', 'A1-16', 'LECTURE');
  addSlot('FY', 'MONDAY', 'FY_AIDS_Division C', '14:30', '15:30', 'ECM', 'SA', 'A1-16', 'LECTURE');

  // AI DS Div D
  addSlot('FY', 'MONDAY', 'FY_AIDS_Division D', '09:15', '10:15', 'LA & DC', 'NC', 'A1-17', 'LECTURE');
  addSlot('FY', 'MONDAY', 'FY_AIDS_Division D', '10:15', '11:15', 'PS&LB', 'SM', 'A1-17', 'LECTURE');
  addSlot('FY', 'MONDAY', 'FY_AIDS_Division D', '11:30', '12:30', 'PD-I', 'MG', 'A1-17', 'LECTURE');
  addSlot('FY', 'MONDAY', 'FY_AIDS_Division D', '13:30', '15:30', 'BEEE', 'SD', 'A0-21', 'LAB', 'D1');
  addSlot('FY', 'MONDAY', 'FY_AIDS_Division D', '13:30', '15:30', 'ECM', 'VJ', 'A0-31', 'LAB', 'D2');

  // ECE Div E
  addSlot('FY', 'MONDAY', 'FY_ECE_Division E', '09:15', '11:15', 'ITP', 'VJ', 'A0-27', 'LAB', 'E1');
  addSlot('FY', 'MONDAY', 'FY_ECE_Division E', '09:15', '11:15', 'ECD', 'RB', 'A0-22', 'LAB', 'E2');
  addSlot('FY', 'MONDAY', 'FY_ECE_Division E', '11:30', '12:30', 'ITP', 'VJ', 'A1-30', 'LECTURE');
  addSlot('FY', 'MONDAY', 'FY_ECE_Division E', '13:30', '14:30', 'EM-I', 'NC', 'A1-30', 'LECTURE');
  addSlot('FY', 'MONDAY', 'FY_ECE_Division E', '14:30', '15:30', 'EP', 'MG', 'A1-30', 'LECTURE');

  // ENTC Div F
  addSlot('FY', 'MONDAY', 'FY_ENTC_Division F', '09:15', '11:15', 'EP', 'NW', 'A0-29', 'LAB', 'F1');
  addSlot('FY', 'MONDAY', 'FY_ENTC_Division F', '09:15', '11:15', 'PD-I', 'SA', 'A1-33', 'LAB', 'F2');
  addSlot('FY', 'MONDAY', 'FY_ENTC_Division F', '11:30', '12:30', 'BEE', 'MP', 'A1-28', 'LECTURE');
  addSlot('FY', 'MONDAY', 'FY_ENTC_Division F', '13:30', '15:30', 'LIBERAL LEARNING', 'SP', 'A1-28', 'LECTURE');

  // --- FY TUESDAY ---
  // Comp Div A
  addSlot('FY', 'TUESDAY', 'FY_COMP_Division A', '09:15', '11:15', 'PD-I', 'MG', 'A1-04', 'LAB', 'A1');
  addSlot('FY', 'TUESDAY', 'FY_COMP_Division A', '09:15', '11:15', 'ECM', 'CH', 'A0-31', 'LAB', 'A2');
  addSlot('FY', 'TUESDAY', 'FY_COMP_Division A', '11:30', '12:30', 'EM-I', 'PP', 'A1-04', 'LECTURE');
  addSlot('FY', 'TUESDAY', 'FY_COMP_Division A', '13:30', '15:30', 'LIBERAL LEARNING', 'SC', 'A1-04', 'LECTURE');

  // Comp Div B
  addSlot('FY', 'TUESDAY', 'FY_COMP_Division B', '09:15', '10:15', 'BEEE', 'SD', 'A1-02', 'LECTURE');
  addSlot('FY', 'TUESDAY', 'FY_COMP_Division B', '10:15', '11:15', 'EM-I', 'PP', 'A1-02', 'LECTURE');
  addSlot('FY', 'TUESDAY', 'FY_COMP_Division B', '11:30', '12:30', 'ECM', 'CH', 'A1-18', 'LECTURE');
  addSlot('FY', 'TUESDAY', 'FY_COMP_Division B', '13:30', '15:30', 'BEEE', 'SD', 'A0-21', 'LAB', 'B1');
  addSlot('FY', 'TUESDAY', 'FY_COMP_Division B', '13:30', '15:30', 'ECM', 'CH', 'A0-31', 'LAB', 'B2');

  // AI DS Div C
  addSlot('FY', 'TUESDAY', 'FY_AIDS_Division C', '09:15', '10:15', 'WAD', 'NL', 'A1-16', 'LECTURE');
  addSlot('FY', 'TUESDAY', 'FY_AIDS_Division C', '10:15', '11:15', 'BEEE', 'SD', 'A1-16', 'LECTURE');
  addSlot('FY', 'TUESDAY', 'FY_AIDS_Division C', '11:30', '12:30', 'LA & DC', 'NC', 'A1-16', 'LECTURE');
  addSlot('FY', 'TUESDAY', 'FY_AIDS_Division C', '13:30', '15:30', 'PS&LB', 'SM', 'A1-06', 'LAB', 'C1');
  addSlot('FY', 'TUESDAY', 'FY_AIDS_Division C', '13:30', '15:30', 'PD-I', 'MG', 'A1-16', 'LAB', 'C2');

  // AI DS Div D
  addSlot('FY', 'TUESDAY', 'FY_AIDS_Division D', '09:15', '11:15', 'PD-I', 'SA', 'A1-33', 'LAB', 'D1');
  addSlot('FY', 'TUESDAY', 'FY_AIDS_Division D', '09:15', '11:15', 'WAD', 'MN', 'A1-20', 'LAB', 'D2');
  addSlot('FY', 'TUESDAY', 'FY_AIDS_Division D', '11:30', '12:30', 'BEEE', 'SD', 'A1-19', 'LECTURE');
  addSlot('FY', 'TUESDAY', 'FY_AIDS_Division D', '13:30', '14:30', 'LIBRARY/GD/GFM', 'GD', 'A1-17/33', 'TUTORIAL');
  addSlot('FY', 'TUESDAY', 'FY_AIDS_Division D', '14:30', '15:30', 'LA & DC', 'NC', 'A1-17', 'LECTURE');

  // ECE Div E
  addSlot('FY', 'TUESDAY', 'FY_ECE_Division E', '09:15', '10:15', 'EM-I', 'NC', 'A1-30', 'LECTURE');
  addSlot('FY', 'TUESDAY', 'FY_ECE_Division E', '10:15', '11:15', 'ECD', 'RB', 'A1-30', 'LECTURE');
  addSlot('FY', 'TUESDAY', 'FY_ECE_Division E', '11:30', '12:30', 'BEE', 'MP', 'A1-30', 'LECTURE');
  addSlot('FY', 'TUESDAY', 'FY_ECE_Division E', '13:30', '14:30', 'EM-I', 'NC', 'A1-30', 'LECTURE');
  addSlot('FY', 'TUESDAY', 'FY_ECE_Division E', '14:30', '15:30', 'PD-I', 'SA', 'A1-30', 'LECTURE');

  // ENTC Div F
  addSlot('FY', 'TUESDAY', 'FY_ENTC_Division F', '09:15', '10:15', 'ECD', 'RB', 'A1-28', 'LECTURE');
  addSlot('FY', 'TUESDAY', 'FY_ENTC_Division F', '10:15', '11:15', 'EM-I', 'NC', 'A1-28', 'LECTURE');
  addSlot('FY', 'TUESDAY', 'FY_ENTC_Division F', '11:30', '12:30', 'ECD', 'RB', 'A1-28', 'LECTURE');
  addSlot('FY', 'TUESDAY', 'FY_ENTC_Division F', '13:30', '15:30', 'ECD', 'RB', 'A1-28', 'LAB', 'F1');
  addSlot('FY', 'TUESDAY', 'FY_ENTC_Division F', '13:30', '15:30', 'ITP', 'VJ', 'A0-27', 'LAB', 'F2');

  // --- FY WEDNESDAY ---
  // Comp Div A
  addSlot('FY', 'WEDNESDAY', 'FY_COMP_Division A', '09:15', '10:15', 'EM-I', 'PP', 'A1-04', 'LECTURE');
  addSlot('FY', 'WEDNESDAY', 'FY_COMP_Division A', '10:15', '11:15', 'ECM', 'CH', 'A1-04', 'LECTURE');
  addSlot('FY', 'WEDNESDAY', 'FY_COMP_Division A', '11:30', '12:30', 'PD-I', 'MG', 'A1-04', 'LECTURE');
  addSlot('FY', 'WEDNESDAY', 'FY_COMP_Division A', '13:30', '15:30', 'BEEE', 'KD', 'A0-21', 'LAB', 'A1');
  addSlot('FY', 'WEDNESDAY', 'FY_COMP_Division A', '13:30', '15:30', 'PD-I', 'MG', 'A1-04', 'LAB', 'A2');

  // Comp Div B
  addSlot('FY', 'WEDNESDAY', 'FY_COMP_Division B', '09:15', '11:15', 'WAD', 'MN', 'A1-20', 'LAB', 'B1');
  addSlot('FY', 'WEDNESDAY', 'FY_COMP_Division B', '09:15', '11:15', 'PS&LB', 'SK', 'A0-27', 'LAB', 'B2');
  addSlot('FY', 'WEDNESDAY', 'FY_COMP_Division B', '11:30', '12:30', 'EM-I', 'PP', 'A1-02', 'LECTURE');
  addSlot('FY', 'WEDNESDAY', 'FY_COMP_Division B', '13:30', '14:30', 'BEEE', 'SD', 'A1-03', 'LECTURE');
  addSlot('FY', 'WEDNESDAY', 'FY_COMP_Division B', '14:30', '15:30', 'LIBRARY/GD/GFM', 'GD', 'A1-02/33', 'TUTORIAL');

  // AI DS Div C
  addSlot('FY', 'WEDNESDAY', 'FY_AIDS_Division C', '09:15', '11:15', 'WAD', 'NL', 'A0-28', 'LAB', 'C1');
  addSlot('FY', 'WEDNESDAY', 'FY_AIDS_Division C', '09:15', '11:15', 'BEEE', 'SD', 'A0-21', 'LAB', 'C2');
  addSlot('FY', 'WEDNESDAY', 'FY_AIDS_Division C', '11:30', '12:30', 'LA & DC', 'NC', 'A1-16', 'LECTURE');
  addSlot('FY', 'WEDNESDAY', 'FY_AIDS_Division C', '13:30', '15:30', 'LIBERAL LEARNING', 'SP', 'A1-16', 'LECTURE');

  // AI DS Div D
  addSlot('FY', 'WEDNESDAY', 'FY_AIDS_Division D', '09:15', '10:15', 'PS&LB', 'SM', 'A1-18', 'LECTURE');
  addSlot('FY', 'WEDNESDAY', 'FY_AIDS_Division D', '10:15', '11:15', 'ECM', 'SA', 'A1-18', 'LECTURE');
  addSlot('FY', 'WEDNESDAY', 'FY_AIDS_Division D', '11:30', '12:30', 'BEEE', 'SD', 'A1-11', 'LECTURE');
  addSlot('FY', 'WEDNESDAY', 'FY_AIDS_Division D', '13:30', '15:30', 'WAD', 'MN', 'A1-09', 'LAB', 'D1');
  addSlot('FY', 'WEDNESDAY', 'FY_AIDS_Division D', '13:30', '15:30', 'PS&LB', 'SM', 'A0-27', 'LAB', 'D2');

  // ECE Div E
  addSlot('FY', 'WEDNESDAY', 'FY_ECE_Division E', '09:15', '10:15', 'IKS', 'CH', 'A1-30', 'LECTURE');
  addSlot('FY', 'WEDNESDAY', 'FY_ECE_Division E', '10:15', '11:15', 'BEE', 'MP', 'A1-30', 'LECTURE');
  addSlot('FY', 'WEDNESDAY', 'FY_ECE_Division E', '11:30', '12:30', 'ECD', 'RB', 'A1-30', 'LECTURE');
  addSlot('FY', 'WEDNESDAY', 'FY_ECE_Division E', '13:30', '15:30', 'LIBERAL LEARNING', 'SP', 'A1-30', 'LECTURE');

  // ENTC Div F
  addSlot('FY', 'WEDNESDAY', 'FY_ENTC_Division F', '09:15', '10:15', 'PD-I', 'SA', 'A1-28', 'LECTURE');
  addSlot('FY', 'WEDNESDAY', 'FY_ENTC_Division F', '10:15', '11:15', 'EM-I', 'NC', 'A1-28', 'LECTURE');
  addSlot('FY', 'WEDNESDAY', 'FY_ENTC_Division F', '11:30', '12:30', 'BEE', 'MP', 'A1-28', 'LECTURE');
  addSlot('FY', 'WEDNESDAY', 'FY_ENTC_Division F', '13:30', '15:30', 'PD-I', 'SA', 'A1-33', 'LAB', 'F1');
  addSlot('FY', 'WEDNESDAY', 'FY_ENTC_Division F', '13:30', '15:30', 'BEE', 'VN', 'A1-21', 'LAB', 'F2');

  // --- FY THURSDAY ---
  // Comp Div A
  addSlot('FY', 'THURSDAY', 'FY_COMP_Division A', '09:15', '10:15', 'EM-I', 'PP', 'A1-02', 'LECTURE');
  addSlot('FY', 'THURSDAY', 'FY_COMP_Division A', '10:15', '11:15', 'IKS', 'CH', 'A1-02', 'LECTURE');
  addSlot('FY', 'THURSDAY', 'FY_COMP_Division A', '11:30', '12:30', 'PS&LB', 'SK', 'A1-04', 'LECTURE');
  addSlot('FY', 'THURSDAY', 'FY_COMP_Division A', '13:30', '15:30', 'PS&LB', 'SK', 'A0-28', 'LAB', 'A1');
  addSlot('FY', 'THURSDAY', 'FY_COMP_Division A', '13:30', '15:30', 'WAD', 'VS', 'A1-20', 'LAB', 'A2');

  // Comp Div B
  addSlot('FY', 'THURSDAY', 'FY_COMP_Division B', '09:15', '10:15', 'ECM', 'CH', 'A1-04', 'LECTURE');
  addSlot('FY', 'THURSDAY', 'FY_COMP_Division B', '10:15', '11:15', 'WAD', 'MN', 'A1-04', 'LECTURE');
  addSlot('FY', 'THURSDAY', 'FY_COMP_Division B', '11:30', '12:30', 'PD-I', 'MG', 'A1-27', 'LECTURE');
  addSlot('FY', 'THURSDAY', 'FY_COMP_Division B', '13:30', '14:30', 'IKS', 'CH', 'A1-04', 'LECTURE');
  addSlot('FY', 'THURSDAY', 'FY_COMP_Division B', '14:30', '15:30', 'EM-I', 'PP', 'A1-04', 'LECTURE');

  // AI DS Div C
  addSlot('FY', 'THURSDAY', 'FY_AIDS_Division C', '09:15', '11:15', 'PD-I', 'MG', 'A1-33', 'LAB', 'C1');
  addSlot('FY', 'THURSDAY', 'FY_AIDS_Division C', '09:15', '11:15', 'ECM', 'VJ', 'A0-31', 'LAB', 'C2');
  addSlot('FY', 'THURSDAY', 'FY_AIDS_Division C', '11:30', '12:30', 'BEEE', 'SD', 'A1-16', 'LECTURE');
  addSlot('FY', 'THURSDAY', 'FY_AIDS_Division C', '13:30', '14:30', 'PS&LB', 'SM', 'A1-16', 'LECTURE');
  addSlot('FY', 'THURSDAY', 'FY_AIDS_Division C', '14:30', '15:30', 'IKS', 'CH', 'A1-16', 'LECTURE');

  // AI DS Div D
  addSlot('FY', 'THURSDAY', 'FY_AIDS_Division D', '09:15', '10:15', 'LA & DC', 'NC', 'A1-16', 'LECTURE');
  addSlot('FY', 'THURSDAY', 'FY_AIDS_Division D', '10:15', '11:15', 'BEEE', 'SD', 'A1-16', 'LECTURE');
  addSlot('FY', 'THURSDAY', 'FY_AIDS_Division D', '11:30', '12:30', 'ECM', 'SA', 'A1-11', 'LECTURE');
  addSlot('FY', 'THURSDAY', 'FY_AIDS_Division D', '13:30', '15:30', 'LIBERAL LEARNING', 'SP', 'A1-11', 'LECTURE');

  // ECE Div E
  addSlot('FY', 'THURSDAY', 'FY_ECE_Division E', '09:15', '11:15', 'PD-I', 'SA', 'A1-30', 'LAB', 'E1');
  addSlot('FY', 'THURSDAY', 'FY_ECE_Division E', '09:15', '11:15', 'EP', 'NW', 'A0-29', 'LAB', 'E2');
  addSlot('FY', 'THURSDAY', 'FY_ECE_Division E', '11:30', '12:30', 'EM-I', 'NC', 'A1-30', 'LECTURE');
  addSlot('FY', 'THURSDAY', 'FY_ECE_Division E', '13:30', '15:30', 'BEE', 'MP', 'A1-21', 'LAB', 'E1');
  addSlot('FY', 'THURSDAY', 'FY_ECE_Division E', '13:30', '15:30', 'ITP', 'VJ', 'A0-27', 'LAB', 'E2');

  // ENTC Div F
  addSlot('FY', 'THURSDAY', 'FY_ENTC_Division F', '09:15', '10:15', 'IKS', 'CH', 'A1-28', 'LECTURE');
  addSlot('FY', 'THURSDAY', 'FY_ENTC_Division F', '10:15', '11:15', 'ECD', 'RB', 'A1-28', 'LECTURE');
  addSlot('FY', 'THURSDAY', 'FY_ENTC_Division F', '11:30', '12:30', 'BEE', 'MP', 'A1-28', 'LECTURE');
  addSlot('FY', 'THURSDAY', 'FY_ENTC_Division F', '13:30', '14:30', 'EM-I', 'NC', 'A1-28', 'LECTURE');
  addSlot('FY', 'THURSDAY', 'FY_ENTC_Division F', '14:30', '15:30', 'LIBRARY/GD', 'GD', 'A1-28/33', 'TUTORIAL');

  // --- FY FRIDAY ---
  // Comp Div A
  addSlot('FY', 'FRIDAY', 'FY_COMP_Division A', '09:15', '10:15', 'PS&LB', 'SK', 'A1-04', 'LECTURE');
  addSlot('FY', 'FRIDAY', 'FY_COMP_Division A', '10:15', '11:15', 'ECM', 'CH', 'A1-03', 'LECTURE');
  addSlot('FY', 'FRIDAY', 'FY_COMP_Division A', '11:30', '12:30', 'BEEE', 'KD', 'A1-02', 'LECTURE');
  addSlot('FY', 'FRIDAY', 'FY_COMP_Division A', '13:30', '15:30', 'ECM', 'CH', 'A0-31', 'LAB', 'A1');
  addSlot('FY', 'FRIDAY', 'FY_COMP_Division A', '13:30', '15:30', 'BEEE', 'KD', 'A0-21', 'LAB', 'A2');

  // Comp Div B
  addSlot('FY', 'FRIDAY', 'FY_COMP_Division B', '09:15', '11:15', 'PS&LB', 'SK', 'A0-30', 'LAB', 'B1');
  addSlot('FY', 'FRIDAY', 'FY_COMP_Division B', '09:15', '11:15', 'PD-I', 'MG', 'A1-04', 'LAB', 'B2');
  addSlot('FY', 'FRIDAY', 'FY_COMP_Division B', '11:30', '12:30', 'ECM', 'CH', 'A1-04', 'LECTURE');
  addSlot('FY', 'FRIDAY', 'FY_COMP_Division B', '13:30', '14:30', 'PS&LB', 'SK', 'A1-04', 'LECTURE');
  addSlot('FY', 'FRIDAY', 'FY_COMP_Division B', '14:30', '15:30', 'EM-I', 'PP', 'A1-04', 'LECTURE');

  // AI DS Div C
  addSlot('FY', 'FRIDAY', 'FY_AIDS_Division C', '09:15', '10:15', 'PS&LB', 'SM', 'A1-16', 'LECTURE');
  addSlot('FY', 'FRIDAY', 'FY_AIDS_Division C', '10:15', '11:15', 'LA & DC', 'NC', 'A1-16', 'LECTURE');
  addSlot('FY', 'FRIDAY', 'FY_AIDS_Division C', '11:30', '12:30', 'PS&LB', 'SM', 'A1-16', 'LECTURE');
  addSlot('FY', 'FRIDAY', 'FY_AIDS_Division C', '13:30', '15:30', 'ECM', 'VJ', 'A0-31', 'LAB', 'C1');
  addSlot('FY', 'FRIDAY', 'FY_AIDS_Division C', '13:30', '15:30', 'PS&LB', 'SM', 'A0-26', 'LAB', 'C2');

  // AI DS Div D
  addSlot('FY', 'FRIDAY', 'FY_AIDS_Division D', '09:15', '11:15', 'ECM', 'VJ', 'A0-31', 'LAB', 'D1');
  addSlot('FY', 'FRIDAY', 'FY_AIDS_Division D', '09:15', '11:15', 'PD-I', 'SA', 'A1-33', 'LAB', 'D2');
  addSlot('FY', 'FRIDAY', 'FY_AIDS_Division D', '11:30', '12:30', 'LA & DC', 'NC', 'A1-17', 'LECTURE');
  addSlot('FY', 'FRIDAY', 'FY_AIDS_Division D', '13:30', '14:30', 'BEEE', 'SD', 'A1-17', 'LECTURE');
  addSlot('FY', 'FRIDAY', 'FY_AIDS_Division D', '14:30', '15:30', 'LIBRARY/GD', 'GD', 'A1-17/33', 'TUTORIAL');

  // ECE Div E
  addSlot('FY', 'FRIDAY', 'FY_ECE_Division E', '09:15', '10:15', 'BEE', 'MP', 'A1-31', 'LECTURE');
  addSlot('FY', 'FRIDAY', 'FY_ECE_Division E', '10:15', '11:15', 'ECD', 'RB', 'A1-30', 'LECTURE');
  addSlot('FY', 'FRIDAY', 'FY_ECE_Division E', '11:30', '12:30', 'EP', 'MG', 'A1-31', 'LECTURE');
  addSlot('FY', 'FRIDAY', 'FY_ECE_Division E', '13:30', '15:30', 'ECD', 'RB', 'A1-30', 'LAB', 'E1');
  addSlot('FY', 'FRIDAY', 'FY_ECE_Division E', '13:30', '15:30', 'BEE', 'MP', 'A1-21', 'LAB', 'E2');

  // ENTC Div F
  addSlot('FY', 'FRIDAY', 'FY_ENTC_Division F', '09:15', '11:15', 'BEE', 'VN', 'A0-21', 'LAB', 'F1');
  addSlot('FY', 'FRIDAY', 'FY_ENTC_Division F', '09:15', '11:15', 'EP', 'NW', 'A0-29', 'LAB', 'F2');
  addSlot('FY', 'FRIDAY', 'FY_ENTC_Division F', '11:30', '12:30', 'EP', 'NW', 'A1-27', 'LECTURE');
  addSlot('FY', 'FRIDAY', 'FY_ENTC_Division F', '13:30', '14:30', 'EP', 'NW', 'A1-28', 'LECTURE');
  addSlot('FY', 'FRIDAY', 'FY_ENTC_Division F', '14:30', '15:30', 'EM-I', 'NC', 'A1-27', 'LECTURE');

  // --- FY SATURDAY ---
  // Comp Div A
  addSlot('FY', 'SATURDAY', 'FY_COMP_Division A', '09:15', '11:15', 'WAD', 'VS', 'A1-20', 'LAB', 'A1');
  addSlot('FY', 'SATURDAY', 'FY_COMP_Division A', '09:15', '11:15', 'PS&LB', 'SK', 'A0-28', 'LAB', 'A2');
  addSlot('FY', 'SATURDAY', 'FY_COMP_Division A', '11:30', '12:30', 'BEEE', 'KD', 'A1-02', 'LECTURE');
  addSlot('FY', 'SATURDAY', 'FY_COMP_Division A', '13:30', '14:30', 'WAD', 'VS', 'A1-02', 'LECTURE');
  addSlot('FY', 'SATURDAY', 'FY_COMP_Division A', '14:30', '15:30', 'LIBRARY/GD/GFM', 'GD', 'A1-04/33', 'TUTORIAL');

  // Comp Div B
  addSlot('FY', 'SATURDAY', 'FY_COMP_Division B', '09:15', '11:15', 'ECM', 'CH', 'A0-31', 'LAB', 'B1');
  addSlot('FY', 'SATURDAY', 'FY_COMP_Division B', '09:15', '11:15', 'BEEE', 'SD', 'A0-21', 'LAB', 'B2');
  addSlot('FY', 'SATURDAY', 'FY_COMP_Division B', '11:30', '12:30', 'BEEE', 'SD', 'A1-04', 'LECTURE');
  addSlot('FY', 'SATURDAY', 'FY_COMP_Division B', '13:30', '14:30', 'ECM', 'CH', 'A1-04', 'LECTURE');
  addSlot('FY', 'SATURDAY', 'FY_COMP_Division B', '14:30', '15:30', 'PS&LB', 'SK', 'A1-04', 'LECTURE');

  // AI DS Div C
  addSlot('FY', 'SATURDAY', 'FY_AIDS_Division C', '09:15', '10:15', 'PD-I', 'MG', 'A1-16', 'LECTURE');
  addSlot('FY', 'SATURDAY', 'FY_AIDS_Division C', '10:15', '11:15', 'LA & DC', 'NC', 'A1-16', 'LECTURE');
  addSlot('FY', 'SATURDAY', 'FY_AIDS_Division C', '11:30', '12:30', 'ECM', 'SA', 'A1-16', 'LECTURE');
  addSlot('FY', 'SATURDAY', 'FY_AIDS_Division C', '13:30', '14:30', 'LIBRARY/GD/GFM', 'GD', 'A1-16/33', 'TUTORIAL');
  addSlot('FY', 'SATURDAY', 'FY_AIDS_Division C', '14:30', '15:30', 'BEEE', 'SD', 'A1-16', 'LECTURE');

  // AI DS Div D
  addSlot('FY', 'SATURDAY', 'FY_AIDS_Division D', '09:15', '10:15', 'WAD', 'MN', 'A1-11', 'LECTURE');
  addSlot('FY', 'SATURDAY', 'FY_AIDS_Division D', '10:15', '11:15', 'WAD', 'MN', 'A1-11', 'LECTURE');
  addSlot('FY', 'SATURDAY', 'FY_AIDS_Division D', '11:30', '12:30', 'IKS', 'CH', 'A1-11', 'LECTURE');
  addSlot('FY', 'SATURDAY', 'FY_AIDS_Division D', '13:30', '15:30', 'PS&LB', 'SM', 'A0-28', 'LAB', 'D1');
  addSlot('FY', 'SATURDAY', 'FY_AIDS_Division D', '13:30', '15:30', 'BEEE', 'SD', 'A0-21', 'LAB', 'D2');

  // ECE Div E
  addSlot('FY', 'SATURDAY', 'FY_ECE_Division E', '09:15', '11:15', 'EP', 'NW', 'A0-29', 'LAB', 'E1');
  addSlot('FY', 'SATURDAY', 'FY_ECE_Division E', '09:15', '11:15', 'PD-I', 'SA', 'A1-33', 'LAB', 'E2');
  addSlot('FY', 'SATURDAY', 'FY_ECE_Division E', '11:30', '12:30', 'EP', 'MG', 'A1-30', 'LECTURE');
  addSlot('FY', 'SATURDAY', 'FY_ECE_Division E', '13:30', '14:30', 'BEE', 'MP', 'A1-30', 'LECTURE');
  addSlot('FY', 'SATURDAY', 'FY_ECE_Division E', '14:30', '15:30', 'LIBRARY/GD/GFM', 'GD', 'A1-30/33', 'TUTORIAL');

  // ENTC Div F
  addSlot('FY', 'SATURDAY', 'FY_ENTC_Division F', '09:15', '11:15', 'ITP', 'VJ', 'A0-27', 'LAB', 'F1');
  addSlot('FY', 'SATURDAY', 'FY_ENTC_Division F', '09:15', '11:15', 'ECD', 'RB', 'A1-28', 'LAB', 'F2');
  addSlot('FY', 'SATURDAY', 'FY_ENTC_Division F', '11:30', '12:30', 'EP', 'NW', 'A1-28', 'LECTURE');
  addSlot('FY', 'SATURDAY', 'FY_ENTC_Division F', '13:30', '14:30', 'ECD', 'RB', 'A1-28', 'LECTURE');
  addSlot('FY', 'SATURDAY', 'FY_ENTC_Division F', '14:30', '15:30', 'BEE', 'MP', 'A1-28', 'LECTURE');


  // =========================================================================
  // SCHEDULE DEFINITION FOR SY B.TECH (SEM: III)
  // =========================================================================

  // --- SY MONDAY ---
  // Comp Div A
  addSlot('SY', 'MONDAY', 'SY_COMP_Division A', '09:15', '10:15', 'DM', 'SP', 'A1-02', 'LECTURE');
  addSlot('SY', 'MONDAY', 'SY_COMP_Division A', '10:15', '11:15', 'DS', 'RT', 'A1-02', 'LECTURE');
  addSlot('SY', 'MONDAY', 'SY_COMP_Division A', '11:30', '12:30', 'LIBRARY/GD/ T&P', 'TP', 'A1-33', 'TUTORIAL');
  addSlot('SY', 'MONDAY', 'SY_COMP_Division A', '12:30', '13:30', 'Java', 'BS', 'A1-02', 'LECTURE');
  addSlot('SY', 'MONDAY', 'SY_COMP_Division A', '14:15', '16:15', 'Java LAB', 'BS', 'A1-06', 'LAB', 'A1');
  addSlot('SY', 'MONDAY', 'SY_COMP_Division A', '14:15', '16:15', 'DS LAB', 'RT', 'A1-07', 'LAB', 'A2');
  addSlot('SY', 'MONDAY', 'SY_COMP_Division A', '14:15', '16:15', 'PASD LAB', 'SC', 'A0-28', 'LAB', 'A3');

  // Comp Div B
  addSlot('SY', 'MONDAY', 'SY_COMP_Division B', '09:15', '11:15', 'PASD LAB', 'SC', 'A0-28', 'LAB', 'B1');
  addSlot('SY', 'MONDAY', 'SY_COMP_Division B', '09:15', '11:15', 'DS LAB', 'PB', 'A1-07', 'LAB', 'B2');
  addSlot('SY', 'MONDAY', 'SY_COMP_Division B', '09:15', '11:15', 'Java LAB', 'BS', 'A1-06', 'LAB', 'B3');
  addSlot('SY', 'MONDAY', 'SY_COMP_Division B', '11:30', '12:30', 'DM', 'SP', 'A1-02', 'LECTURE');
  addSlot('SY', 'MONDAY', 'SY_COMP_Division B', '12:30', '13:30', 'LIBRARY/GD/ T&P', 'TP', 'A1-03', 'TUTORIAL');
  addSlot('SY', 'MONDAY', 'SY_COMP_Division B', '14:15', '16:15', 'Liberal Learning-III-SP', 'SP', 'A1-03', 'LECTURE');

  // AI DS Div C
  addSlot('SY', 'MONDAY', 'SY_AIDS_Division C', '09:15', '10:15', 'DSA', 'KK', 'A1-11', 'LECTURE');
  addSlot('SY', 'MONDAY', 'SY_AIDS_Division C', '10:15', '11:15', 'CG', 'SD', 'A1-11', 'LECTURE');
  addSlot('SY', 'MONDAY', 'SY_AIDS_Division C', '11:30', '12:30', 'DM & SM', 'SVM', 'A1-11', 'LECTURE');
  addSlot('SY', 'MONDAY', 'SY_AIDS_Division C', '12:30', '13:30', 'SAI', 'SP', 'A1-11', 'LECTURE');
  addSlot('SY', 'MONDAY', 'SY_AIDS_Division C', '14:15', '15:15', 'LIBRARY/GD/ T&P', 'TP', 'A1-16', 'TUTORIAL');
  addSlot('SY', 'MONDAY', 'SY_AIDS_Division C', '15:15', '16:15', 'C++', 'YC', 'A1-11', 'LECTURE');

  // AI DS Div D
  addSlot('SY', 'MONDAY', 'SY_AIDS_Division D', '09:15', '10:15', 'CG', 'SD', 'A1-16', 'LECTURE');
  addSlot('SY', 'MONDAY', 'SY_AIDS_Division D', '10:15', '11:15', 'DSA', 'KK', 'A1-16', 'LECTURE');
  addSlot('SY', 'MONDAY', 'SY_AIDS_Division D', '11:30', '13:30', 'Python LAB', 'SD', 'A0-23', 'LAB', 'D1');
  addSlot('SY', 'MONDAY', 'SY_AIDS_Division D', '11:30', '13:30', 'DSA LAB', 'KK', 'A1-07', 'LAB', 'D2');
  addSlot('SY', 'MONDAY', 'SY_AIDS_Division D', '11:30', '13:30', 'C++ LAB', 'YC', 'A1-09', 'LAB', 'D3');
  addSlot('SY', 'MONDAY', 'SY_AIDS_Division D', '14:15', '15:15', 'C++', 'YC', 'A1-17', 'LECTURE');
  addSlot('SY', 'MONDAY', 'SY_AIDS_Division D', '15:15', '16:15', 'LIBRARY/GD/ T&P', 'TP', 'A1-16', 'TUTORIAL');

  // ECE Div E
  addSlot('SY', 'MONDAY', 'SY_ECE_Division E', '09:15', '10:15', 'EM-III', 'PP', 'A1-31', 'LECTURE');
  addSlot('SY', 'MONDAY', 'SY_ECE_Division E', '10:15', '11:15', 'DSA', 'MP', 'A1-31', 'LECTURE');
  addSlot('SY', 'MONDAY', 'SY_ECE_Division E', '11:30', '12:30', 'COA', 'SC', 'A1-31', 'LECTURE');
  addSlot('SY', 'MONDAY', 'SY_ECE_Division E', '12:30', '13:30', 'COA', 'SC', 'A1-31', 'LECTURE');
  addSlot('SY', 'MONDAY', 'SY_ECE_Division E', '14:15', '16:15', 'DEM LAB', 'AB', 'A1-21', 'LAB', 'E1');
  addSlot('SY', 'MONDAY', 'SY_ECE_Division E', '14:15', '16:15', 'E-Workshop', 'VN', 'A0-23', 'LAB', 'E2');
  addSlot('SY', 'MONDAY', 'SY_ECE_Division E', '14:15', '16:15', 'DSA LAB', 'MP', 'A1-20', 'LAB', 'E3');

  // ENTC Div F
  addSlot('SY', 'MONDAY', 'SY_ENTC_Division F', '09:15', '11:15', 'DSDA LAB', 'AB', 'A1-19', 'LAB', 'F1');
  addSlot('SY', 'MONDAY', 'SY_ENTC_Division F', '09:15', '11:15', 'PST-I', 'KD', 'A1-15', 'LAB', 'F2');
  addSlot('SY', 'MONDAY', 'SY_ENTC_Division F', '09:15', '11:15', 'FOCP LAB', 'JJ', 'A0-23', 'LAB', 'F3');
  addSlot('SY', 'MONDAY', 'SY_ENTC_Division F', '11:30', '12:30', 'DSA', 'PB', 'A1-27', 'LECTURE');
  addSlot('SY', 'MONDAY', 'SY_ENTC_Division F', '12:30', '13:30', 'NAS', 'RB', 'A1-27', 'LECTURE');
  addSlot('SY', 'MONDAY', 'SY_ENTC_Division F', '14:15', '15:15', 'LIBRARY/GD/ T&P', 'TP', 'A1-27/33', 'TUTORIAL');
  addSlot('SY', 'MONDAY', 'SY_ENTC_Division F', '15:15', '16:15', 'EM-III', 'PP', 'A1-27', 'LECTURE');

  // --- SY TUESDAY ---
  // Comp Div A
  addSlot('SY', 'TUESDAY', 'SY_COMP_Division A', '09:15', '11:15', 'DS LAB', 'RT', 'A0-28', 'LAB', 'A1');
  addSlot('SY', 'TUESDAY', 'SY_COMP_Division A', '09:15', '11:15', 'Java LAB', 'BS', 'A1-06', 'LAB', 'A2');
  addSlot('SY', 'TUESDAY', 'SY_COMP_Division A', '09:15', '11:15', 'DS LAB', 'PB', 'A1-09', 'LAB', 'A3');
  addSlot('SY', 'TUESDAY', 'SY_COMP_Division A', '11:30', '12:30', 'Java', 'BS', 'A1-02', 'LECTURE');
  addSlot('SY', 'TUESDAY', 'SY_COMP_Division A', '12:30', '13:30', 'OE - 1', 'TS', 'A1-02', 'LECTURE');
  addSlot('SY', 'TUESDAY', 'SY_COMP_Division A', '14:15', '16:15', 'DS', 'RT', 'A1-07', 'LAB', 'A1');
  addSlot('SY', 'TUESDAY', 'SY_COMP_Division A', '14:15', '16:15', 'PASD LAB', 'SC', 'A0-28', 'LAB', 'A2');
  addSlot('SY', 'TUESDAY', 'SY_COMP_Division A', '14:15', '16:15', 'Java LAB', 'MN', 'A1-07', 'LAB', 'A3');

  // Comp Div B
  addSlot('SY', 'TUESDAY', 'SY_COMP_Division B', '09:15', '10:15', 'PASD', 'SC', 'A1-03', 'LECTURE');
  addSlot('SY', 'TUESDAY', 'SY_COMP_Division B', '10:15', '11:15', 'DM', 'SP', 'A1-03', 'LECTURE');
  addSlot('SY', 'TUESDAY', 'SY_COMP_Division B', '11:30', '12:30', 'DS', 'RT', 'A1-03', 'LECTURE');
  addSlot('SY', 'TUESDAY', 'SY_COMP_Division B', '12:30', '13:30', 'PASD', 'SC', 'A1-03', 'LECTURE');
  addSlot('SY', 'TUESDAY', 'SY_COMP_Division B', '14:15', '15:15', 'DM & SM', 'SVM', 'A1-03', 'LECTURE');
  addSlot('SY', 'TUESDAY', 'SY_COMP_Division B', '15:15', '16:15', 'DM', 'SP', 'A1-03', 'LECTURE');

  // AI DS Div C
  addSlot('SY', 'TUESDAY', 'SY_AIDS_Division C', '09:15', '10:15', 'DM & SM', 'SVM', 'A1-11', 'LECTURE');
  addSlot('SY', 'TUESDAY', 'SY_AIDS_Division C', '10:15', '11:15', 'CG', 'SD', 'A1-11', 'LECTURE');
  addSlot('SY', 'TUESDAY', 'SY_AIDS_Division C', '11:30', '13:30', 'DSA LAB', 'KK', 'A1-07', 'LAB', 'C1');
  addSlot('SY', 'TUESDAY', 'SY_AIDS_Division C', '11:30', '13:30', 'Python LAB', 'NL', 'A1-09', 'LAB', 'C2');
  addSlot('SY', 'TUESDAY', 'SY_AIDS_Division C', '11:30', '13:30', 'Python LAB', 'SD', 'A0-23', 'LAB', 'C3');
  addSlot('SY', 'TUESDAY', 'SY_AIDS_Division C', '14:15', '16:15', 'Liberal Learning-III-SG/CS/RD', 'SG', 'A1-11', 'LECTURE');

  // AI DS Div D
  addSlot('SY', 'TUESDAY', 'SY_AIDS_Division D', '09:15', '10:15', 'SAI', 'SP', 'A1-17', 'LECTURE');
  addSlot('SY', 'TUESDAY', 'SY_AIDS_Division D', '10:15', '11:15', 'DM & SM', 'SVM', 'A1-17', 'LECTURE');
  addSlot('SY', 'TUESDAY', 'SY_AIDS_Division D', '11:30', '12:30', 'OE - 1', 'VJ', 'A1-17', 'LECTURE');
  addSlot('SY', 'TUESDAY', 'SY_AIDS_Division D', '12:30', '13:30', 'SAI', 'SP', 'A1-17', 'LECTURE');
  addSlot('SY', 'TUESDAY', 'SY_AIDS_Division D', '14:15', '16:15', 'C++ LAB', 'YC', 'A0-26', 'LAB', 'D1');
  addSlot('SY', 'TUESDAY', 'SY_AIDS_Division D', '14:15', '16:15', 'Python LAB', 'SD', 'A0-23', 'LAB', 'D2');
  addSlot('SY', 'TUESDAY', 'SY_AIDS_Division D', '14:15', '16:15', 'Python LAB', 'NL', 'A1-06', 'LAB', 'D3');

  // ECE Div E
  addSlot('SY', 'TUESDAY', 'SY_ECE_Division E', '09:15', '11:15', 'PST-I', 'KD', 'A1-15A', 'LAB', 'E1');
  addSlot('SY', 'TUESDAY', 'SY_ECE_Division E', '09:15', '11:15', 'DSA LAB', 'MP', 'A0-26', 'LAB', 'E2');
  addSlot('SY', 'TUESDAY', 'SY_ECE_Division E', '09:15', '11:15', 'E-Workshop', 'VN', 'A1-21', 'LAB', 'E3');
  addSlot('SY', 'TUESDAY', 'SY_ECE_Division E', '11:30', '12:30', 'DEM', 'AB', 'A1-31', 'LECTURE');
  addSlot('SY', 'TUESDAY', 'SY_ECE_Division E', '12:30', '13:30', 'LIBRARY/GD/ T&P', 'TP', 'A1-31/33', 'TUTORIAL');
  addSlot('SY', 'TUESDAY', 'SY_ECE_Division E', '14:15', '15:15', 'DEM', 'AB', 'A1-31', 'LECTURE');
  addSlot('SY', 'TUESDAY', 'SY_ECE_Division E', '15:15', '16:15', 'EM-III', 'PP', 'A1-31', 'LECTURE');

  // ENTC Div F
  addSlot('SY', 'TUESDAY', 'SY_ENTC_Division F', '09:15', '10:15', 'DSDA', 'AB', 'A1-27', 'LECTURE');
  addSlot('SY', 'TUESDAY', 'SY_ENTC_Division F', '10:15', '11:15', 'EM-III', 'PP', 'A1-27', 'LECTURE');
  addSlot('SY', 'TUESDAY', 'SY_ENTC_Division F', '11:30', '13:30', 'PST-I', 'KD', 'A1-15A', 'LAB', 'F1');
  addSlot('SY', 'TUESDAY', 'SY_ENTC_Division F', '11:30', '13:30', 'FOCP LAB', 'JJ', 'A0-28', 'LAB', 'F2');
  addSlot('SY', 'TUESDAY', 'SY_ENTC_Division F', '11:30', '13:30', 'DSA LAB', 'PB', 'A0-26', 'LAB', 'F3');
  addSlot('SY', 'TUESDAY', 'SY_ENTC_Division F', '14:15', '15:15', 'OE - 1', 'TS', 'A1-27', 'LECTURE');
  addSlot('SY', 'TUESDAY', 'SY_ENTC_Division F', '15:15', '16:15', 'LIBRARY/GD', 'GD', 'A1-28/33', 'TUTORIAL');

  // --- SY WEDNESDAY ---
  // Comp Div A
  addSlot('SY', 'WEDNESDAY', 'SY_COMP_Division A', '09:15', '10:15', 'DS', 'RT', 'A1-02', 'LECTURE');
  addSlot('SY', 'WEDNESDAY', 'SY_COMP_Division A', '10:15', '11:15', 'PASD', 'SC', 'A1-02', 'LECTURE');
  addSlot('SY', 'WEDNESDAY', 'SY_COMP_Division A', '11:30', '13:30', 'PASD LAB', 'SC', 'A0-28', 'LAB', 'A1');
  addSlot('SY', 'WEDNESDAY', 'SY_COMP_Division A', '11:30', '13:30', 'Java LAB', 'BS', 'A1-06', 'LAB', 'A2');
  addSlot('SY', 'WEDNESDAY', 'SY_COMP_Division A', '11:30', '13:30', 'DS LAB', 'PB', 'A1-09', 'LAB', 'A3');
  addSlot('SY', 'WEDNESDAY', 'SY_COMP_Division A', '14:15', '15:15', 'DM & SM', 'SVM', 'A1-02', 'LECTURE');
  addSlot('SY', 'WEDNESDAY', 'SY_COMP_Division A', '15:15', '16:15', 'DM', 'SP', 'A1-02', 'LECTURE');

  // Comp Div B
  addSlot('SY', 'WEDNESDAY', 'SY_COMP_Division B', '09:15', '10:15', 'DM & SM TUT', 'SVM', 'A1-03', 'TUTORIAL');
  addSlot('SY', 'WEDNESDAY', 'SY_COMP_Division B', '10:15', '11:15', 'DS', 'RT', 'A1-03', 'LECTURE');
  addSlot('SY', 'WEDNESDAY', 'SY_COMP_Division B', '11:30', '12:30', 'OE - 1', 'CH', 'A1-03', 'LECTURE');
  addSlot('SY', 'WEDNESDAY', 'SY_COMP_Division B', '12:30', '13:30', 'DM', 'SP', 'A1-03', 'LECTURE');
  addSlot('SY', 'WEDNESDAY', 'SY_COMP_Division B', '14:15', '16:15', 'DS LAB', 'PB', 'A0-23', 'LAB', 'B1');
  addSlot('SY', 'WEDNESDAY', 'SY_COMP_Division B', '14:15', '16:15', 'Java LAB', 'BS', 'A1-06', 'LAB', 'B2');
  addSlot('SY', 'WEDNESDAY', 'SY_COMP_Division B', '14:15', '16:15', 'DS LAB', 'RT', 'A0-26', 'LAB', 'B3');

  // AI DS Div C
  addSlot('SY', 'WEDNESDAY', 'SY_AIDS_Division C', '09:15', '10:15', 'SAI', 'SP', 'A1-11', 'LECTURE');
  addSlot('SY', 'WEDNESDAY', 'SY_AIDS_Division C', '10:15', '11:15', 'DM & SM', 'SVM', 'A1-11', 'LECTURE');
  addSlot('SY', 'WEDNESDAY', 'SY_AIDS_Division C', '11:30', '12:30', 'CG', 'SD', 'A1-11', 'LECTURE');
  addSlot('SY', 'WEDNESDAY', 'SY_AIDS_Division C', '12:30', '13:30', 'C++', 'YC', 'A1-11', 'LECTURE');
  addSlot('SY', 'WEDNESDAY', 'SY_AIDS_Division C', '14:15', '15:15', 'SAI', 'SP', 'A1-11', 'LECTURE');
  addSlot('SY', 'WEDNESDAY', 'SY_AIDS_Division C', '15:15', '16:15', 'DSA', 'KK', 'A1-11', 'LECTURE');

  // AI DS Div D
  addSlot('SY', 'WEDNESDAY', 'SY_AIDS_Division D', '09:15', '11:15', 'Python LAB', 'SD', 'A0-23', 'LAB', 'D1');
  addSlot('SY', 'WEDNESDAY', 'SY_AIDS_Division D', '09:15', '11:15', 'C++ LAB', 'YC', 'A0-26', 'LAB', 'D2');
  addSlot('SY', 'WEDNESDAY', 'SY_AIDS_Division D', '09:15', '11:15', 'DSA LAB', 'KK', 'A1-09', 'LAB', 'D3');
  addSlot('SY', 'WEDNESDAY', 'SY_AIDS_Division D', '11:30', '12:30', 'DSA', 'KK', 'A1-17', 'LECTURE');
  addSlot('SY', 'WEDNESDAY', 'SY_AIDS_Division D', '12:30', '13:30', 'CG', 'SD', 'A1-17', 'LECTURE');
  addSlot('SY', 'WEDNESDAY', 'SY_AIDS_Division D', '14:15', '16:15', 'Liberal Learning-III-SP', 'SP', 'A1-17', 'LECTURE');

  // ECE Div E
  addSlot('SY', 'WEDNESDAY', 'SY_ECE_Division E', '09:15', '10:15', 'OE - 1', 'TS', 'A1-31', 'LECTURE');
  addSlot('SY', 'WEDNESDAY', 'SY_ECE_Division E', '10:15', '11:15', 'COA', 'SC', 'A1-31', 'LECTURE');
  addSlot('SY', 'WEDNESDAY', 'SY_ECE_Division E', '11:30', '12:30', 'PST-I', 'KD', 'A1-31', 'LECTURE');
  addSlot('SY', 'WEDNESDAY', 'SY_ECE_Division E', '12:30', '13:30', 'GFM', 'VN', 'A1-31', 'TUTORIAL');
  addSlot('SY', 'WEDNESDAY', 'SY_ECE_Division E', '14:15', '15:15', 'DEM', 'AB', 'A1-31', 'LECTURE');
  addSlot('SY', 'WEDNESDAY', 'SY_ECE_Division E', '15:15', '16:15', 'DSA', 'MP', 'A1-31', 'LECTURE');

  // ENTC Div F
  addSlot('SY', 'WEDNESDAY', 'SY_ENTC_Division F', '09:15', '10:15', 'NAS', 'RB', 'A1-27', 'LECTURE');
  addSlot('SY', 'WEDNESDAY', 'SY_ENTC_Division F', '10:15', '11:15', 'DSA', 'PB', 'A1-27', 'LECTURE');
  addSlot('SY', 'WEDNESDAY', 'SY_ENTC_Division F', '11:30', '12:30', 'DSDA', 'AB', 'A1-27', 'LECTURE');
  addSlot('SY', 'WEDNESDAY', 'SY_ENTC_Division F', '12:30', '13:30', 'PST-I', 'KD', 'A1-27', 'LECTURE');
  addSlot('SY', 'WEDNESDAY', 'SY_ENTC_Division F', '14:15', '15:15', 'OE - 1', 'TS', 'A1-27', 'LECTURE');
  addSlot('SY', 'WEDNESDAY', 'SY_ENTC_Division F', '15:15', '16:15', 'FOCP', 'YC', 'A1-27', 'LECTURE');

  // --- SY THURSDAY ---
  // Comp Div A
  addSlot('SY', 'THURSDAY', 'SY_COMP_Division A', '09:15', '11:15', 'PBL', 'VK', 'A0-23', 'LAB', 'A1');
  addSlot('SY', 'THURSDAY', 'SY_COMP_Division A', '11:30', '12:30', 'DS', 'RT', 'A1-02', 'LECTURE');
  addSlot('SY', 'THURSDAY', 'SY_COMP_Division A', '12:30', '13:30', 'DM & SM', 'SVM', 'A1-02', 'LECTURE');
  addSlot('SY', 'THURSDAY', 'SY_COMP_Division A', '14:15', '15:15', 'PASD', 'SC', 'A1-02', 'LECTURE');
  addSlot('SY', 'THURSDAY', 'SY_COMP_Division A', '15:15', '16:15', 'GFM', 'BS', 'A1-02', 'TUTORIAL');

  // Comp Div B
  addSlot('SY', 'THURSDAY', 'SY_COMP_Division B', '09:15', '11:15', 'Java LAB', 'BS', 'A1-06', 'LAB', 'B1');
  addSlot('SY', 'THURSDAY', 'SY_COMP_Division B', '09:15', '11:15', 'DS LAB', 'PB', 'A1-07', 'LAB', 'B2');
  addSlot('SY', 'THURSDAY', 'SY_COMP_Division B', '09:15', '11:15', 'PASD LAB', 'SC', 'A0-28', 'LAB', 'B3');
  addSlot('SY', 'THURSDAY', 'SY_COMP_Division B', '11:30', '12:30', 'Java', 'BS', 'A1-03', 'LECTURE');
  addSlot('SY', 'THURSDAY', 'SY_COMP_Division B', '12:30', '13:30', 'DS', 'RT', 'A1-03', 'LECTURE');
  addSlot('SY', 'THURSDAY', 'SY_COMP_Division B', '14:15', '15:15', 'Java', 'BS', 'A1-03', 'LECTURE');
  addSlot('SY', 'THURSDAY', 'SY_COMP_Division B', '15:15', '16:15', 'OE - 1', 'CH', 'A1-03', 'LECTURE');

  // AI DS Div C
  addSlot('SY', 'THURSDAY', 'SY_AIDS_Division C', '09:15', '10:15', 'DSA', 'KK', 'A1-11', 'LECTURE');
  addSlot('SY', 'THURSDAY', 'SY_AIDS_Division C', '10:15', '11:15', 'SAI', 'SP', 'A1-11', 'LECTURE');
  addSlot('SY', 'THURSDAY', 'SY_AIDS_Division C', '11:30', '13:30', 'C++ LAB', 'YC', 'A1-06', 'LAB', 'C1');
  addSlot('SY', 'THURSDAY', 'SY_AIDS_Division C', '11:30', '13:30', 'Python LAB', 'NL', 'A1-09', 'LAB', 'C2');
  addSlot('SY', 'THURSDAY', 'SY_AIDS_Division C', '11:30', '13:30', 'Python LAB', 'SD', 'A0-23', 'LAB', 'C3');
  addSlot('SY', 'THURSDAY', 'SY_AIDS_Division C', '14:15', '15:15', 'C++', 'YC', 'A1-11', 'LECTURE');
  addSlot('SY', 'THURSDAY', 'SY_AIDS_Division C', '15:15', '16:15', 'LIBRARY/GD/ T&P', 'TP', 'A1-11', 'TUTORIAL');

  // AI DS Div D
  addSlot('SY', 'THURSDAY', 'SY_AIDS_Division D', '09:15', '10:15', 'C++', 'YC', 'A1-17', 'LECTURE');
  addSlot('SY', 'THURSDAY', 'SY_AIDS_Division D', '10:15', '11:15', 'DSA', 'KK', 'A1-17', 'LECTURE');
  addSlot('SY', 'THURSDAY', 'SY_AIDS_Division D', '11:30', '12:30', 'DM & SM', 'SVM', 'A1-17', 'LECTURE');
  addSlot('SY', 'THURSDAY', 'SY_AIDS_Division D', '12:30', '13:30', 'SAI', 'SP', 'A1-17', 'LECTURE');
  addSlot('SY', 'THURSDAY', 'SY_AIDS_Division D', '14:15', '15:15', 'LIBRARY/GD/ T&P', 'TP', 'A1-17/33', 'TUTORIAL');
  addSlot('SY', 'THURSDAY', 'SY_AIDS_Division D', '15:15', '16:15', 'SAI', 'SP', 'A1-17', 'LECTURE');

  // ECE Div E
  addSlot('SY', 'THURSDAY', 'SY_ECE_Division E', '09:15', '11:15', 'E-Workshop', 'VN', 'A0-23', 'LAB', 'E1');
  addSlot('SY', 'THURSDAY', 'SY_ECE_Division E', '09:15', '11:15', 'PST-I', 'KD', 'A1-11', 'LAB', 'E2');
  addSlot('SY', 'THURSDAY', 'SY_ECE_Division E', '09:15', '11:15', 'DEM LAB', 'AB', 'A1-21', 'LAB', 'E3');
  addSlot('SY', 'THURSDAY', 'SY_ECE_Division E', '11:30', '13:30', 'PBL', 'VK', 'A0-23', 'LAB', 'E1');
  addSlot('SY', 'THURSDAY', 'SY_ECE_Division E', '14:15', '15:15', 'DEM', 'AB', 'A1-30', 'LECTURE');
  addSlot('SY', 'THURSDAY', 'SY_ECE_Division E', '15:15', '16:15', 'EM-III', 'PP', 'A1-31', 'LECTURE');

  // ENTC Div F
  addSlot('SY', 'THURSDAY', 'SY_ENTC_Division F', '09:15', '10:15', 'NAS', 'RB', 'A1-27', 'LECTURE');
  addSlot('SY', 'THURSDAY', 'SY_ENTC_Division F', '10:15', '11:15', 'LIBRARY/GD/ T&P', 'TP', 'A1-27', 'TUTORIAL');
  addSlot('SY', 'THURSDAY', 'SY_ENTC_Division F', '11:30', '13:30', 'DSA LAB', 'PB', 'A0-26', 'LAB', 'F1');
  addSlot('SY', 'THURSDAY', 'SY_ENTC_Division F', '11:30', '13:30', 'DSDA LAB', 'AB', 'A1-21', 'LAB', 'F2');
  addSlot('SY', 'THURSDAY', 'SY_ENTC_Division F', '11:30', '13:30', 'PST-I', 'KD', 'A1-15A', 'LAB', 'F3');
  addSlot('SY', 'THURSDAY', 'SY_ENTC_Division F', '14:15', '16:15', 'Liberal Learning-III-SP', 'SP', 'A1-27', 'LECTURE');

  // --- SY FRIDAY ---
  // Comp Div A
  addSlot('SY', 'FRIDAY', 'SY_COMP_Division A', '09:15', '10:15', 'DS', 'RT', 'A1-02', 'LECTURE');
  addSlot('SY', 'FRIDAY', 'SY_COMP_Division A', '10:15', '11:15', 'PASD', 'SC', 'A1-02', 'LECTURE');
  addSlot('SY', 'FRIDAY', 'SY_COMP_Division A', '11:30', '13:30', 'Java LAB', 'BS', 'A1-06', 'LAB', 'A1');
  addSlot('SY', 'FRIDAY', 'SY_COMP_Division A', '11:30', '13:30', 'DS LAB', 'RT', 'A1-07', 'LAB', 'A2');
  addSlot('SY', 'FRIDAY', 'SY_COMP_Division A', '11:30', '13:30', 'Java LAB', 'MN', 'A1-09', 'LAB', 'A3');
  addSlot('SY', 'FRIDAY', 'SY_COMP_Division A', '14:15', '15:15', 'OE - 1', 'TS', 'A1-02', 'LECTURE');
  addSlot('SY', 'FRIDAY', 'SY_COMP_Division A', '15:15', '16:15', 'DM', 'SP', 'A1-02', 'LECTURE');

  // Comp Div B
  addSlot('SY', 'FRIDAY', 'SY_COMP_Division B', '09:15', '11:15', 'PBL', 'VK', 'A0-23', 'LAB', 'B1');
  addSlot('SY', 'FRIDAY', 'SY_COMP_Division B', '11:30', '12:30', 'DM', 'SP', 'A1-03', 'LECTURE');
  addSlot('SY', 'FRIDAY', 'SY_COMP_Division B', '12:30', '13:30', 'DM & SM', 'SVM', 'A1-03', 'LECTURE');
  addSlot('SY', 'FRIDAY', 'SY_COMP_Division B', '14:15', '16:15', 'Java LAB', 'BS', 'A1-06', 'LAB', 'B1');
  addSlot('SY', 'FRIDAY', 'SY_COMP_Division B', '14:15', '16:15', 'PASD LAB', 'SC', 'A0-28', 'LAB', 'B2');
  addSlot('SY', 'FRIDAY', 'SY_COMP_Division B', '14:15', '16:15', 'DS LAB', 'RT', 'A1-07', 'LAB', 'B3');

  // AI DS Div C
  addSlot('SY', 'FRIDAY', 'SY_AIDS_Division C', '09:15', '11:15', 'Python LAB', 'NL', 'A1-09', 'LAB', 'C1');
  addSlot('SY', 'FRIDAY', 'SY_AIDS_Division C', '09:15', '11:15', 'DSA LAB', 'KK', 'A1-07', 'LAB', 'C2');
  addSlot('SY', 'FRIDAY', 'SY_AIDS_Division C', '09:15', '11:15', 'C++ LAB', 'YC', 'A1-06', 'LAB', 'C3');
  addSlot('SY', 'FRIDAY', 'SY_AIDS_Division C', '11:30', '12:30', 'CG', 'SD', 'A1-11', 'LECTURE');
  addSlot('SY', 'FRIDAY', 'SY_AIDS_Division C', '12:30', '13:30', 'OE - 1', 'VS', 'A1-11', 'LECTURE');
  addSlot('SY', 'FRIDAY', 'SY_AIDS_Division C', '14:15', '15:15', 'DSA', 'KK', 'A1-11', 'LECTURE');
  addSlot('SY', 'FRIDAY', 'SY_AIDS_Division C', '15:15', '16:15', 'LIBRARY/GD', 'GD', 'A1-11', 'TUTORIAL');

  // AI DS Div D
  addSlot('SY', 'FRIDAY', 'SY_AIDS_Division D', '09:15', '10:15', 'SAI', 'SP', 'A1-17', 'LECTURE');
  addSlot('SY', 'FRIDAY', 'SY_AIDS_Division D', '10:15', '11:15', 'CG', 'SD', 'A1-17', 'LECTURE');
  addSlot('SY', 'FRIDAY', 'SY_AIDS_Division D', '11:30', '12:30', 'DM & SM', 'SVM', 'A1-17', 'LECTURE');
  addSlot('SY', 'FRIDAY', 'SY_AIDS_Division D', '12:30', '13:30', 'OE - 1', 'VJ', 'A1-17', 'LECTURE');
  addSlot('SY', 'FRIDAY', 'SY_AIDS_Division D', '14:15', '15:15', 'C++', 'YC', 'A1-17', 'LECTURE');
  addSlot('SY', 'FRIDAY', 'SY_AIDS_Division D', '15:15', '16:15', 'DSA', 'KK', 'A1-17', 'LECTURE');

  // ECE Div E
  addSlot('SY', 'FRIDAY', 'SY_ECE_Division E', '09:15', '10:15', 'COA', 'SC', 'A1-30', 'LECTURE');
  addSlot('SY', 'FRIDAY', 'SY_ECE_Division E', '10:15', '11:15', 'DSA', 'MP', 'A1-30', 'LECTURE');
  addSlot('SY', 'FRIDAY', 'SY_ECE_Division E', '11:30', '12:30', 'EM-III', 'PP', 'A1-30', 'LECTURE');
  addSlot('SY', 'FRIDAY', 'SY_ECE_Division E', '12:30', '13:30', 'COA', 'SC', 'A1-30', 'LECTURE');
  addSlot('SY', 'FRIDAY', 'SY_ECE_Division E', '14:15', '16:15', 'CIE-II ACTIVITY SUBMISSION', 'SC', 'A1-30', 'LECTURE');

  // ENTC Div F
  addSlot('SY', 'FRIDAY', 'SY_ENTC_Division F', '09:15', '10:15', 'EM-III', 'PP', 'A1-27', 'LECTURE');
  addSlot('SY', 'FRIDAY', 'SY_ENTC_Division F', '10:15', '11:15', 'DSDA', 'AB', 'A1-27', 'LECTURE');
  addSlot('SY', 'FRIDAY', 'SY_ENTC_Division F', '11:30', '13:30', 'FOCP LAB', 'YC', 'A1-23', 'LAB', 'F1');
  addSlot('SY', 'FRIDAY', 'SY_ENTC_Division F', '11:30', '13:30', 'DSA LAB', 'PB', 'A0-26', 'LAB', 'F2');
  addSlot('SY', 'FRIDAY', 'SY_ENTC_Division F', '11:30', '13:30', 'DSDA LAB', 'AB', 'A1-19', 'LAB', 'F3');
  addSlot('SY', 'FRIDAY', 'SY_ENTC_Division F', '14:15', '15:15', 'GFM', 'VN', 'A1-27', 'TUTORIAL');
  addSlot('SY', 'FRIDAY', 'SY_ENTC_Division F', '15:15', '16:15', 'DSA', 'PB', 'A1-27', 'LECTURE');

  // --- SY SATURDAY ---
  // Comp Div A
  addSlot('SY', 'SATURDAY', 'SY_COMP_Division A', '09:15', '10:15', 'DM', 'SP', 'A1-02', 'LECTURE');
  addSlot('SY', 'SATURDAY', 'SY_COMP_Division A', '10:15', '11:15', 'DM & SM TUT', 'SVM', 'A1-02', 'TUTORIAL');
  addSlot('SY', 'SATURDAY', 'SY_COMP_Division A', '11:30', '13:30', 'Liberal Learning-III-SG', 'SG', 'A1-02', 'LECTURE');
  addSlot('SY', 'SATURDAY', 'SY_COMP_Division A', '14:15', '15:15', 'Java', 'BS', 'A1-02', 'LECTURE');
  addSlot('SY', 'SATURDAY', 'SY_COMP_Division A', '15:15', '16:15', 'DM', 'SP', 'A1-02', 'LECTURE');

  // Comp Div B
  addSlot('SY', 'SATURDAY', 'SY_COMP_Division B', '09:15', '10:15', 'DS', 'RT', 'A1-03', 'LECTURE');
  addSlot('SY', 'SATURDAY', 'SY_COMP_Division B', '10:15', '11:15', 'Java', 'BS', 'A1-03', 'LECTURE');
  addSlot('SY', 'SATURDAY', 'SY_COMP_Division B', '11:30', '13:30', 'DS LAB', 'PB', 'A1-07', 'LAB', 'B1');
  addSlot('SY', 'SATURDAY', 'SY_COMP_Division B', '11:30', '13:30', 'Java LAB', 'BS', 'A1-09', 'LAB', 'B2');
  addSlot('SY', 'SATURDAY', 'SY_COMP_Division B', '11:30', '13:30', 'Java LAB', 'MN', 'A1-06', 'LAB', 'B3');
  addSlot('SY', 'SATURDAY', 'SY_COMP_Division B', '14:15', '15:15', 'PASD', 'SC', 'A1-03', 'LECTURE');
  addSlot('SY', 'SATURDAY', 'SY_COMP_Division B', '15:15', '16:15', 'GFM', 'SC', 'A1-03', 'TUTORIAL');

  // AI DS Div C
  addSlot('SY', 'SATURDAY', 'SY_AIDS_Division C', '09:15', '11:15', 'PBL', 'VK', 'A0-23', 'LAB', 'C1');
  addSlot('SY', 'SATURDAY', 'SY_AIDS_Division C', '11:30', '12:30', 'SAI', 'SP', 'A1-11', 'LECTURE');
  addSlot('SY', 'SATURDAY', 'SY_AIDS_Division C', '12:30', '13:30', 'DM & SM', 'SVM', 'A1-11', 'LECTURE');
  addSlot('SY', 'SATURDAY', 'SY_AIDS_Division C', '14:15', '16:15', 'Python LAB', 'NL', 'A0-28', 'LAB', 'C1');
  addSlot('SY', 'SATURDAY', 'SY_AIDS_Division C', '14:15', '16:15', 'C++ LAB', 'YC', 'A1-07', 'LAB', 'C2');
  addSlot('SY', 'SATURDAY', 'SY_AIDS_Division C', '14:15', '16:15', 'DSA LAB', 'KK', 'A1-09', 'LAB', 'C3');

  // AI DS Div D
  addSlot('SY', 'SATURDAY', 'SY_AIDS_Division D', '09:15', '11:15', 'DSA LAB', 'KK', 'A1-09', 'LAB', 'D1');
  addSlot('SY', 'SATURDAY', 'SY_AIDS_Division D', '09:15', '11:15', 'Python LAB', 'SD', 'A1-07', 'LAB', 'D2');
  addSlot('SY', 'SATURDAY', 'SY_AIDS_Division D', '09:15', '11:15', 'Python LAB', 'NL', 'A1-06', 'LAB', 'D3');
  addSlot('SY', 'SATURDAY', 'SY_AIDS_Division D', '11:30', '13:30', 'PBL', 'VK', 'A0-23', 'LAB', 'D1');
  addSlot('SY', 'SATURDAY', 'SY_AIDS_Division D', '14:15', '15:15', 'GFM', 'YC', 'A1-30', 'TUTORIAL');
  addSlot('SY', 'SATURDAY', 'SY_AIDS_Division D', '15:15', '16:15', 'LIBRARY/GD/ T&P', 'TP', 'A1-30/33', 'TUTORIAL');

  // ECE Div E
  addSlot('SY', 'SATURDAY', 'SY_ECE_Division E', '09:15', '11:15', 'DSA LAB', 'MP', 'A0-26', 'LAB', 'E1');
  addSlot('SY', 'SATURDAY', 'SY_ECE_Division E', '09:15', '11:15', 'DEM LAB', 'AB', 'A1-21', 'LAB', 'E2');
  addSlot('SY', 'SATURDAY', 'SY_ECE_Division E', '09:15', '11:15', 'PST-I', 'KD', 'A1-15A', 'LAB', 'E3');
  addSlot('SY', 'SATURDAY', 'SY_ECE_Division E', '11:30', '12:30', 'DSA', 'MP', 'A1-30', 'LECTURE');
  addSlot('SY', 'SATURDAY', 'SY_ECE_Division E', '12:30', '13:30', 'DEM', 'AB', 'A1-31', 'LECTURE');
  addSlot('SY', 'SATURDAY', 'SY_ECE_Division E', '14:15', '16:15', 'Liberal Learning - III-SP', 'SP', 'A1-30', 'LECTURE');

  // ENTC Div F
  addSlot('SY', 'SATURDAY', 'SY_ENTC_Division F', '09:15', '10:15', 'DSA', 'PB', 'A1-27', 'LECTURE');
  addSlot('SY', 'SATURDAY', 'SY_ENTC_Division F', '10:15', '11:15', 'EM-III', 'PP', 'A1-27', 'LECTURE');
  addSlot('SY', 'SATURDAY', 'SY_ENTC_Division F', '11:30', '12:30', 'FOCP', 'YC', 'A1-27', 'LECTURE');
  addSlot('SY', 'SATURDAY', 'SY_ENTC_Division F', '12:30', '13:30', 'NAS', 'RB', 'A1-27', 'LECTURE');
  addSlot('SY', 'SATURDAY', 'SY_ENTC_Division F', '14:15', '16:15', 'CIE-II ACTIVITY SUBMISSION', 'PP', 'A1-27', 'LECTURE');

  console.log(`Inserting ${rawSlots.length} authentic timetable slots...`);

  // Insert in chunks or loop to track progress
  let inserted = 0;
  for (const s of rawSlots) {
    await prisma.timetableSlot.create({
      data: s,
    });
    inserted++;
  }

  console.log(`✅ Successfully inserted ${inserted} authentic timetable slots!`);

  // 6. Update faculty assigned subjects (FacultySubjectAssignment) so faculty dashboards reflect their courses
  console.log('🔄 Syncing FacultySubjectAssignment records with timetable...');
  const distinctFacSubs = {};
  for (const s of rawSlots) {
    const key = `${s.facultyId}_${s.subjectId}_${s.sectionId}`;
    if (!distinctFacSubs[key]) {
      distinctFacSubs[key] = {
        facultyId: s.facultyId,
        subjectId: s.subjectId,
        sectionId: s.sectionId,
      };
    }
  }

  // Clear old assignments and link authentic ones
  await prisma.facultySubjectAssignment.deleteMany({});
  for (const val of Object.values(distinctFacSubs)) {
    const sec = sections.find((x) => x.id === val.sectionId);
    await prisma.facultySubjectAssignment.create({
      data: {
        facultyId: val.facultyId,
        subjectId: val.subjectId,
        sectionId: val.sectionId,
        batchId: sec ? sec.batchId : sections[0].batchId,
        academicSession: '2026-27',
      },
    });
  }

  console.log(`✅ Successfully synced ${Object.keys(distinctFacSubs).length} FacultySubjectAssignment records!`);
  console.log('🎉 Timetable update complete across Faculty, Student and Administrative modules.');
}

main()
  .catch((e) => {
    console.error('❌ Error during timetable population:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
