/**
 * Build a cleaned FY + SY B.Tech roll-call master from the official workbooks.
 *
 * Reads the division sheets (students, practical-batch ranges, GFM / class teacher),
 * repairs obvious sheet typos (shifted cells, truncated batch end-rolls), and writes:
 *   data/students_master.json
 *   data/students_rollcall_clean.xlsx
 *
 * Inputs default to the copies kept inside this project (backend/data/), falling back
 * to the original Downloads location, so the whole pipeline runs from the ERP folder.
 * Pass explicit paths to override:  node scripts/build-rollcall-master.js <fy.xlsx> <sy.xlsx>
 *
 * ZPRNs are never invented. Duplicates, branch-code mismatches, and missing ZPRNs
 * are kept as printed and recorded in data_issues.
 */
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

function resolveInput(argvPath, repoRelative, downloadsPath) {
  if (argvPath) return argvPath;
  const repoPath = path.resolve(__dirname, repoRelative);
  return fs.existsSync(repoPath) ? repoPath : downloadsPath;
}

const FY_PATH = resolveInput(
  process.argv[2],
  '../data/FY_roll_call_2026-27.xlsx',
  'c:/Users/LENOVO/Downloads/FY. B.Tech Roll Call List along with ZPRN 2026-27.xlsx'
);
const SY_PATH = resolveInput(
  process.argv[3],
  '../data/SY_roll_call.xlsx',
  'c:/Users/LENOVO/Downloads/SY. B.Tech Roll Call List along with ZPRN.xlsx'
);

const OUT_JSON = path.resolve(__dirname, '../../data/students_master.json');
const OUT_XLSX = path.resolve(__dirname, '../../data/students_rollcall_clean.xlsx');

const ROLL_RE = /^([A-Z]{2})(\d{4})$/;
const ZPRN_RE = /^(\d{4})U([A-Z]{2})(\d{3,5})$/;

const DEPTS = {
  CO: {
    name: 'Computer Engineering',
    rollPrefix: 'CO',
    zprnCode: 'CO',
  },
  AIDS: {
    name: 'Artificial Intelligence and Data Science',
    rollPrefix: 'AD',
    zprnCode: 'AD',
  },
  ECE: {
    name: 'Electronics and Computer Engineering',
    rollPrefix: 'EC',
    zprnCode: 'EC',
  },
  ENTC: {
    name: 'Electronics and Telecommunication Engineering',
    rollPrefix: 'ET',
    zprnCode: 'ET',
  },
};

const SHEET_DEPT = {
  'CO A': 'CO',
  'CO B': 'CO',
  'AIDS A': 'AIDS',
  'AIDS B': 'AIDS',
  'ECE A': 'ECE',
  'E&TC A': 'ENTC',
};

// Division sheets are named "<dept label> <division letter>" (e.g. "CO A", "E&TC A").
// Exact names win; otherwise the leading label is resolved through aliases so that a
// newly added division (e.g. "CO C", "AIDS C") is still captured instead of skipped.
const SHEET_DEPT_ALIASES = {
  CO: 'CO',
  COMP: 'CO',
  COMPUTER: 'CO',
  AIDS: 'AIDS',
  AD: 'AIDS',
  'AI&DS': 'AIDS',
  ECE: 'ECE',
  EC: 'ECE',
  ENTC: 'ENTC',
  'E&TC': 'ENTC',
  ETC: 'ENTC',
  ET: 'ENTC',
};

function cell(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

function cleanName(value) {
  return cell(value).toUpperCase();
}

function cleanStaff(value) {
  return cell(value)
    .replace(/\bProf\.(?!\s)/gi, 'Prof. ')
    .replace(/\bMrs\.(?!\s)/gi, 'Mrs. ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanMobile(value) {
  const digits = String(value == null ? '' : value).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 10) return digits;
  return null;
}

function parseRoll(value) {
  const match = cell(value).toUpperCase().match(ROLL_RE);
  if (!match) return null;
  return { prefix: match[1], num: Number(match[2]), roll: match[1] + match[2] };
}

function formatRoll(prefix, num) {
  return prefix + String(num).padStart(4, '0');
}

function deptOfRoll(roll) {
  const parsed = parseRoll(roll);
  if (!parsed) return null;
  return Object.keys(DEPTS).find((code) => DEPTS[code].rollPrefix === parsed.prefix) || null;
}

function deptOfSheet(sheetName) {
  if (SHEET_DEPT[sheetName]) return SHEET_DEPT[sheetName];
  const label = cell(sheetName).split(/\s+/)[0].toUpperCase();
  return SHEET_DEPT_ALIASES[label] || null;
}

/**
 * Sheet footers sometimes drop or add a digit in the batch end roll
 * ("AD1428 to AD153", "AD1325 to AD13548"). Repair only when the
 * stated headcount uniquely identifies the intended end roll.
 */
function repairEndRoll(startRoll, endRaw, statedCount) {
  const start = parseRoll(startRoll);
  if (!start) return null;
  const printed = parseRoll(endRaw);
  const count = statedCount ? Number(statedCount) : null;

  if (
    printed &&
    printed.prefix === start.prefix &&
    printed.num >= start.num &&
    (count == null || printed.num - start.num + 1 === count)
  ) {
    return { roll: printed.roll, repaired: false, printed: cell(endRaw).toUpperCase() };
  }

  const digits = cell(endRaw).toUpperCase().replace(/[^0-9]/g, '');
  const width = String(start.num).length;
  const candidates = new Set();

  if (digits.length > width) {
    for (let i = 0; i < digits.length; i += 1) {
      candidates.add(digits.slice(0, i) + digits.slice(i + 1));
    }
  }
  if (digits.length > 0 && digits.length < width) {
    for (let pos = 0; pos <= digits.length; pos += 1) {
      for (let dig = 0; dig <= 9; dig += 1) {
        candidates.add(digits.slice(0, pos) + String(dig) + digits.slice(pos));
      }
    }
  }
  candidates.add(digits);

  const hits = [];
  for (const candidate of candidates) {
    if (candidate.length !== width) continue;
    const num = Number(candidate);
    if (num < start.num) continue;
    const span = num - start.num + 1;
    if (count != null && span !== count) continue;
    hits.push(formatRoll(start.prefix, num));
  }

  const unique = [...new Set(hits)];
  if (unique.length === 1) {
    return {
      roll: unique[0],
      repaired: true,
      printed: cell(endRaw).toUpperCase(),
    };
  }
  if (printed) {
    return { roll: printed.roll, repaired: false, printed: printed.roll, ambiguous: true };
  }
  return null;
}

function sheetRows(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
}

function headerText(rows) {
  return rows
    .slice(0, 6)
    .map((row) => row.map(cell).filter(Boolean).join(' '))
    .join('\n');
}

function parseMeta(rows) {
  const text = headerText(rows);
  const yearMatch = text.match(/Academic Year:\s*([0-9]{4})\s*[–-]\s*([0-9]{4})/i);
  const classMatch = text.match(/Class:\s*(FY|SY)/i);
  const divMatch = text.match(/Div\.\s*:\s*([A-Z])/i);
  const totalMatch = text.match(/Total Number of Students:\s*(\d+)/i);
  const deptMatch = text.match(/Department:\s*(.+?)\s{2,}Semester/i);
  const semMatch = text.match(/Semester:\s*([IVX0-9]+)/i);
  return {
    academicYear: yearMatch ? `${yearMatch[1]}-${yearMatch[2]}` : null,
    classYear: classMatch ? classMatch[1].toUpperCase() : null,
    sheetDivision: divMatch ? divMatch[1].toUpperCase() : null,
    statedTotal: totalMatch ? Number(totalMatch[1]) : null,
    departmentLabel: deptMatch ? cell(deptMatch[1]) : null,
    headerSemester: semMatch ? semMatch[1].toUpperCase() : null,
  };
}

function findRollColumns(rows) {
  for (let i = 0; i < Math.min(rows.length, 12); i += 1) {
    const labels = rows[i].map((value) => cell(value).toUpperCase());
    const rollCols = [];
    labels.forEach((label, index) => {
      if (label === 'ROLL NO.' || label === 'ROLL NO') rollCols.push(index);
    });
    if (rollCols.length) return { headerIndex: i, rollCols };
  }
  return { headerIndex: -1, rollCols: [] };
}

function readStudentGroup(row, rollCol) {
  const srRaw = row[rollCol - 2];
  let zprn = cell(row[rollCol - 1]).toUpperCase().replace(/\s+/g, '');
  let roll = cell(row[rollCol]).toUpperCase().replace(/\s+/g, '');
  let name = cleanName(row[rollCol + 1]);
  const flags = [];

  // A missing ZPRN shifts the roll number into the ZPRN column and the name into the roll column.
  if (!ROLL_RE.test(roll) && ROLL_RE.test(zprn) && !name && /[A-Z]/.test(roll)) {
    name = cleanName(roll);
    roll = zprn;
    zprn = '';
    flags.push('SHIFTED_ROW_REPAIRED', 'MISSING_ZPRN');
  }

  if (!ROLL_RE.test(roll)) return null;
  if (!zprn) {
    if (!flags.includes('MISSING_ZPRN')) flags.push('MISSING_ZPRN');
    zprn = null;
  } else if (!ZPRN_RE.test(zprn)) {
    flags.push('INVALID_ZPRN');
  }
  if (!name) flags.push('MISSING_NAME');

  const sr = Number(String(srRaw).replace(/[^\d]/g, ''));
  return {
    sr_no: Number.isFinite(sr) && sr > 0 ? sr : null,
    zprn,
    roll_no: roll,
    name,
    flags,
  };
}

function extractStudents(rows, rollCols, headerIndex) {
  const students = [];
  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];
    const joined = row.map(cell).join(' ');
    if (/batches for subjects/i.test(joined)) break;
    for (const rollCol of rollCols) {
      const student = readStudentGroup(row, rollCol);
      if (student) students.push(student);
    }
  }
  students.sort((a, b) => a.roll_no.localeCompare(b.roll_no));
  return students;
}

function extractBatches(rows) {
  const batches = [];
  rows.forEach((row) => {
    const parts = row.map(cell).filter(Boolean);
    if (parts.length < 2) return;
    const match = parts[0].match(/^([A-Z]\d+)\s*-\s*Roll number\s+([A-Z]{2}\d+)\s+to\s+([A-Z0-9]+)/i);
    if (!match) return;
    const stated = Number(String(parts[1]).replace(/[^\d]/g, '')) || null;
    const repaired = repairEndRoll(match[2].toUpperCase(), match[3], stated);
    batches.push({
      code: match[1].toUpperCase(),
      printed_range: `${match[2].toUpperCase()} to ${cell(match[3]).toUpperCase()}`,
      start: match[2].toUpperCase(),
      end: repaired ? repaired.roll : null,
      end_repaired: Boolean(repaired && repaired.repaired),
      stated_total: stated,
    });
  });
  return batches;
}

const ROLE_RE = /^(?:GFM Batch\s*\d+|Class Teacher|Head of Department|Head of Campus)$/i;

function assignStaff(staff, label, name, mobile) {
  const gfm = label.match(/^GFM Batch\s*(\d+)/i);
  if (gfm) {
    staff.gfm.push({ batchIndex: Number(gfm[1]), name: name || null, mobile: mobile || null });
    return;
  }
  if (/^class teacher$/i.test(label)) staff.classTeacher = { name: name || null, mobile: mobile || null };
  if (/^head of department$/i.test(label)) staff.hod = { name: name || null, mobile: mobile || null };
  if (/^head of campus$/i.test(label)) staff.headOfCampus = { name: name || null, mobile: mobile || null };
}

function extractStaff(rows) {
  const staff = {
    gfm: [],
    classTeacher: null,
    hod: null,
    headOfCampus: null,
  };

  for (let i = 0; i < rows.length; i += 1) {
    const values = rows[i].map(cell);
    const texts = values.filter(Boolean);
    if (!texts.length) continue;

    const nextFull = i + 1 < rows.length ? rows[i + 1].map(cell) : [];
    const nextTexts = nextFull.filter(Boolean);
    const nextAreRoles = nextTexts.length > 0 && nextTexts.every((text) => ROLE_RE.test(text));
    const thisAreNames = texts.every((text) => !ROLE_RE.test(text) && !/^details$/i.test(text));

    // SY footers put names on one row and roles on the next: "Prof. X | Prof. Y" / "Class Teacher | Head of Campus".
    if (nextAreRoles && thisAreNames) {
      values.forEach((name, index) => {
        const role = nextFull[index];
        if (!name || !role || !ROLE_RE.test(role)) return;
        assignStaff(staff, role, cleanStaff(name), null);
      });
      i += 1;
      continue;
    }

    // FY footers separate label / name / mobile with blank cells, so read the
    // compacted (non-empty) values instead of adjacent physical columns.
    const label = texts[0];
    if (!ROLE_RE.test(label)) continue;
    assignStaff(staff, label, cleanStaff(texts[1] || ''), cleanMobile(texts[2] || ''));
  }

  return staff;
}

function assignBatches(students, batches) {
  const parsed = batches.map((batch) => {
    const start = parseRoll(batch.start);
    const end = parseRoll(batch.end);
    return { ...batch, startNum: start && start.num, endNum: end && end.num, prefix: start && start.prefix };
  });

  students.forEach((student) => {
    const roll = parseRoll(student.roll_no);
    const matches = parsed.filter(
      (batch) => roll && batch.prefix === roll.prefix && roll.num >= batch.startNum && roll.num <= batch.endNum
    );
    if (matches.length === 1) {
      student.batch = matches[0].code;
    } else if (matches.length > 1) {
      student.batch = matches[0].code;
      student.flags.push('OVERLAPPING_BATCH_RANGE');
    } else {
      student.batch = null;
      student.flags.push('UNASSIGNED_BATCH');
    }
  });
}

function admissionOf(zprn, year) {
  if (!zprn || !ZPRN_RE.test(zprn)) return null;
  const seq = Number(zprn.match(ZPRN_RE)[3]);
  if (year === 'SY' && seq >= 2000) return 'DSE';
  return 'REGULAR';
}

function parseWorkbook(filePath, fallbackYear) {
  const workbook = XLSX.readFile(filePath);
  const divisions = [];
  const unmappedSheets = [];
  let headOfCampus = null;

  for (const sheetName of workbook.SheetNames) {
    const deptCode = deptOfSheet(sheetName);
    if (!deptCode) {
      unmappedSheets.push(sheetName);
      continue;
    }
    const rows = sheetRows(workbook, sheetName);
    const meta = parseMeta(rows);
    const { headerIndex, rollCols } = findRollColumns(rows);
    const students = headerIndex >= 0 ? extractStudents(rows, rollCols, headerIndex) : [];
    const batches = extractBatches(rows);
    const staff = extractStaff(rows);
    assignBatches(students, batches);
    if (staff.headOfCampus && staff.headOfCampus.name) headOfCampus = staff.headOfCampus;

    const divisionLetter = (batches[0] && batches[0].code[0]) || meta.sheetDivision;
    students.forEach((student) => {
      student.admission = admissionOf(student.zprn, meta.classYear || fallbackYear);
      const owner = student.zprn && ZPRN_RE.test(student.zprn) ? student.zprn.match(ZPRN_RE)[2] : null;
      const expected = DEPTS[deptCode].zprnCode;
      if (owner && owner !== expected) {
        student.flags.push('BRANCH_CODE_MISMATCH');
        student.zprn_branch = owner;
      }
    });

    divisions.push({
      sheetName,
      deptCode,
      year: meta.classYear || fallbackYear,
      meta,
      divisionLetter,
      students,
      batches,
      staff,
    });
  }

  return { divisions, headOfCampus, unmappedSheets, sheetNames: workbook.SheetNames };
}

function batchPayload(batch, students, gfm) {
  const members = students.filter((student) => student.batch === batch.code);
  const payload = {
    range: batch.end ? `${batch.start} to ${batch.end}` : batch.printed_range,
    total: members.length,
  };
  if (batch.end_repaired) payload.source_range = batch.printed_range;
  if (batch.stated_total != null && batch.stated_total !== members.length) {
    payload.stated_total = batch.stated_total;
  }
  if (gfm) payload.gfm_teacher = { name: gfm.name, mobile: gfm.mobile };
  return payload;
}

function studentPayload(student) {
  const row = {
    sr_no: student.sr_no,
    zprn: student.zprn,
    roll_no: student.roll_no,
    name: student.name,
    batch: student.batch,
  };
  if (student.admission) row.admission = student.admission;
  if (student.flags.length) row.flags = [...new Set(student.flags)];
  return row;
}

function buildMaster(fy, sy) {
  const issues = [];
  const head = fy.headOfCampus || sy.headOfCampus || { name: null, mobile: null };
  const departments = {};

  for (const [year, source] of [['FY', fy], ['SY', sy]]) {
    source.unmappedSheets.forEach((sheetName) => {
      issues.push({
        type: 'UNMAPPED_SHEET',
        message: `${year} sheet "${sheetName}" was not recognised as a division sheet and was not stored. Add its department label to SHEET_DEPT or SHEET_DEPT_ALIASES.`,
        location: `${year} ${sheetName}`,
      });
    });
  }

  for (const code of Object.keys(DEPTS)) {
    departments[code] = {
      name: DEPTS[code].name,
      roll_prefix: DEPTS[code].rollPrefix,
      head_of_department: null,
      fy: { semester: 'I', divisions: {} },
      sy: { semester: 'III', divisions: {} },
    };
  }

  const parsed = [...fy.divisions, ...sy.divisions];
  const zprnGroups = new Map();
  for (const division of parsed) {
    for (const student of division.students) {
      if (!student.zprn) continue;
      if (!zprnGroups.has(student.zprn)) zprnGroups.set(student.zprn, []);
      zprnGroups.get(student.zprn).push(student);
    }
  }
  for (const group of zprnGroups.values()) {
    if (group.length < 2) continue;
    group.forEach((student) => {
      if (!student.flags.includes('DUPLICATE_ZPRN')) student.flags.push('DUPLICATE_ZPRN');
    });
  }

  for (const division of parsed) {
    const dept = departments[division.deptCode];
    const yearKey = division.year === 'SY' ? 'sy' : 'fy';
    if (division.staff.hod && division.staff.hod.name && !dept.head_of_department) {
      dept.head_of_department = division.staff.hod;
    }

    const expectedSemester = yearKey === 'fy' ? 'I' : 'III';
    if (division.meta.headerSemester && division.meta.headerSemester !== expectedSemester) {
      issues.push({
        type: 'HEADER_SEMESTER',
        message: `${division.year} ${division.deptCode} ${division.sheetName} is printed as Semester ${division.meta.headerSemester}. Stored as Semester ${expectedSemester}.`,
        location: division.sheetName,
      });
    }
    if (
      division.meta.sheetDivision &&
      division.divisionLetter &&
      division.meta.sheetDivision !== division.divisionLetter
    ) {
      issues.push({
        type: 'SHEET_DIVISION_MISMATCH',
        message: `${division.sheetName} header says Div ${division.meta.sheetDivision}, but roll series and batch labels are Div ${division.divisionLetter}. Stored as Div ${division.divisionLetter}.`,
        location: `${division.year} ${division.deptCode}`,
      });
    }

    const batches = {};
    division.batches.forEach((batch, index) => {
      const gfm = division.staff.gfm.find((item) => item.batchIndex === index + 1) || null;
      batches[batch.code] = batchPayload(batch, division.students, gfm);
      if (batch.end_repaired) {
        issues.push({
          type: 'BATCH_RANGE_TYPO',
          message: `${batch.code} printed as "${batch.printed_range}" (${batch.stated_total} students). Corrected to ${batch.start} to ${batch.end}.`,
          location: `${division.year} ${division.deptCode} ${division.sheetName}`,
        });
      }
      if (batch.stated_total != null && batches[batch.code].total !== batch.stated_total) {
        issues.push({
          type: 'BATCH_COUNT_MISMATCH',
          message: `${batch.code} states ${batch.stated_total} students but ${batches[batch.code].total} roll numbers fall in ${batches[batch.code].range}.`,
          location: `${division.year} ${division.deptCode}`,
        });
      }
    });

    const letter = division.divisionLetter || division.meta.sheetDivision || 'X';
    dept[yearKey].divisions[letter] = {
      div_code: `${division.deptCode}_${division.year}_${letter}`,
      source_sheet: division.sheetName,
      total_students: division.students.length,
      stated_total: division.meta.statedTotal,
      class_teacher: division.staff.classTeacher,
      batches,
      students: division.students.map(studentPayload),
    };

    if (division.meta.statedTotal != null && division.meta.statedTotal !== division.students.length) {
      issues.push({
        type: 'DIVISION_COUNT_MISMATCH',
        message: `${division.sheetName} states ${division.meta.statedTotal} students; ${division.students.length} were read.`,
        location: `${division.year} ${division.deptCode} Div ${letter}`,
      });
    }
  }

  const allStudents = parsed.flatMap((division) =>
    division.students.map((student) => ({
      ...student,
      year: division.year,
      deptCode: division.deptCode,
      division: division.divisionLetter,
    }))
  );

  const byZprn = new Map();
  for (const student of allStudents) {
    if (!student.zprn) continue;
    if (!byZprn.has(student.zprn)) byZprn.set(student.zprn, []);
    byZprn.get(student.zprn).push(student);
  }
  for (const [zprn, group] of byZprn) {
    if (group.length < 2) continue;
    const locations = group.map((student) => `${student.year} ${student.deptCode} ${student.division} ${student.roll_no} ${student.name}`);
    issues.push({
      type: 'DUPLICATE_ZPRN',
      zprn,
      message: `${zprn} is printed on ${group.length} students.`,
      locations,
    });
  }

  for (const student of allStudents) {
    if (student.flags.includes('MISSING_ZPRN')) {
      issues.push({
        type: 'MISSING_ZPRN',
        message: `${student.name} (${student.roll_no}) has no ZPRN.`,
        location: `${student.year} ${student.deptCode} Div ${student.division}`,
      });
    }
    if (student.flags.includes('BRANCH_CODE_MISMATCH')) {
      issues.push({
        type: 'BRANCH_CODE_MISMATCH',
        zprn: student.zprn,
        message: `${student.roll_no} ${student.name} is in ${student.deptCode} but ZPRN ${student.zprn} carries branch code ${student.zprn_branch}. Left unchanged (likely a branch change).`,
        location: `${student.year} ${student.deptCode} Div ${student.division}`,
      });
    }
    if (student.flags.includes('UNASSIGNED_BATCH')) {
      issues.push({
        type: 'UNASSIGNED_BATCH',
        message: `${student.roll_no} ${student.name} does not fall inside any printed batch range.`,
        location: `${student.year} ${student.deptCode}`,
      });
    }
  }

  const summary = {
    students: allStudents.length,
    fy: allStudents.filter((student) => student.year === 'FY').length,
    sy: allStudents.filter((student) => student.year === 'SY').length,
    by_department: {},
    duplicate_zprn: issues.filter((issue) => issue.type === 'DUPLICATE_ZPRN').length,
    missing_zprn: issues.filter((issue) => issue.type === 'MISSING_ZPRN').length,
    branch_code_mismatch: issues.filter((issue) => issue.type === 'BRANCH_CODE_MISMATCH').length,
    batch_range_typos_corrected: issues.filter((issue) => issue.type === 'BATCH_RANGE_TYPO').length,
  };
  for (const code of Object.keys(DEPTS)) {
    const rows = allStudents.filter((student) => student.deptCode === code);
    summary.by_department[code] = {
      total: rows.length,
      fy: rows.filter((student) => student.year === 'FY').length,
      sy: rows.filter((student) => student.year === 'SY').length,
    };
  }

  return {
    college: 'Zeal College of Engineering and Research',
    campus: 'Induri, Pune',
    academic_year: '2026-2027',
    head_of_campus: head,
    sources: [
      { year: 'FY', file: path.basename(FY_PATH) },
      { year: 'SY', file: path.basename(SY_PATH) },
    ],
    summary,
    departments,
    data_issues: issues,
  };
}

function writeWorkbook(master) {
  const flat = [];
  for (const [deptCode, dept] of Object.entries(master.departments)) {
    for (const yearKey of ['fy', 'sy']) {
      const year = yearKey.toUpperCase();
      for (const [letter, division] of Object.entries(dept[yearKey].divisions)) {
        const gfmByBatch = {};
        for (const [batchCode, batch] of Object.entries(division.batches)) {
          if (batch.gfm_teacher) gfmByBatch[batchCode] = batch.gfm_teacher.name;
        }
        for (const student of division.students) {
          flat.push({
            Year: year,
            Semester: dept[yearKey].semester,
            Department: dept.name,
            'Dept Code': deptCode,
            Division: letter,
            Batch: student.batch || '',
            'Roll No': student.roll_no,
            ZPRN: student.zprn || '',
            'Student Name': student.name,
            Admission: student.admission || '',
            'GFM Teacher': gfmByBatch[student.batch] || '',
            'Class Teacher': division.class_teacher ? division.class_teacher.name || '' : '',
            Flags: (student.flags || []).join(', '),
          });
        }
      }
    }
  }

  const issueRows = master.data_issues.map((issue) => ({
    Type: issue.type,
    Detail: issue.message,
    Location: issue.location || (issue.locations || []).join(' | '),
    ZPRN: issue.zprn || '',
  }));

  const summaryRows = [
    { Metric: 'Academic year', Value: master.academic_year },
    { Metric: 'Students', Value: master.summary.students },
    { Metric: 'FY', Value: master.summary.fy },
    { Metric: 'SY', Value: master.summary.sy },
    ...Object.entries(master.summary.by_department).map(([code, counts]) => ({
      Metric: code,
      Value: `${counts.total} (FY ${counts.fy}, SY ${counts.sy})`,
    })),
    { Metric: 'Duplicate ZPRN groups', Value: master.summary.duplicate_zprn },
    { Metric: 'Missing ZPRN', Value: master.summary.missing_zprn },
    { Metric: 'Branch-code mismatches', Value: master.summary.branch_code_mismatch },
    { Metric: 'Batch range typos corrected', Value: master.summary.batch_range_typos_corrected },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(flat), 'Students');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(issueRows), 'Data issues');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), 'Summary');
  XLSX.writeFile(workbook, OUT_XLSX);
}

function main() {
  if (!fs.existsSync(FY_PATH)) throw new Error(`FY workbook not found: ${FY_PATH}`);
  if (!fs.existsSync(SY_PATH)) throw new Error(`SY workbook not found: ${SY_PATH}`);

  const fy = parseWorkbook(FY_PATH, 'FY');
  const sy = parseWorkbook(SY_PATH, 'SY');
  const master = buildMaster(fy, sy);

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(master, null, 2) + '\n');
  writeWorkbook(master);

  console.log(JSON.stringify(master.summary, null, 2));
  console.log(`issues: ${master.data_issues.length}`);
  console.log(`json: ${OUT_JSON}`);
  console.log(`xlsx: ${OUT_XLSX}`);
}

main();
