/**
 * Seed script to import monthly report CSV submissions into the ERP database.
 * Reads 10 CSV files (M1–M5, M8–M12) from user-uploaded paths,
 * parses their faculty/student/activity data rows, and stores each
 * as a MonthlyReportSubmission with MonthlyReportEntry children.
 */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// ── Helpers ────────────────────────────────────────────────────
/** Parse a CSV line respecting quoted fields that may contain commas and newlines */
function parseCSVLine(line) {
  const result = [];
  let i = 0;
  let current = '';
  let inQuotes = false;

  while (i < line.length) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i += 2;
      } else if (ch === '"') {
        inQuotes = false;
        i++;
      } else {
        current += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ',') {
        result.push(current.trim());
        current = '';
        i++;
      } else {
        current += ch;
        i++;
      }
    }
  }
  result.push(current.trim());
  return result;
}

/** Rejoin multi-line CSV rows (where a quoted field spans lines) */
function rejoinCSVLines(rawLines) {
  const joined = [];
  let buffer = '';
  let quoteCount = 0;

  for (const line of rawLines) {
    buffer += (buffer ? '\n' : '') + line;
    quoteCount += (line.match(/"/g) || []).length;

    if (quoteCount % 2 === 0) {
      joined.push(buffer);
      buffer = '';
      quoteCount = 0;
    }
  }
  if (buffer) joined.push(buffer);
  return joined;
}

// ── CSV File Definitions ───────────────────────────────────────
const uploadDir = path.join(
  process.env.USERPROFILE || 'C:\\Users\\LENOVO',
  '.gemini', 'antigravity', 'brain',
  '874ea086-3738-4550-b071-afc66a64b05c',
  '.user_uploaded'
);

const csvFiles = [
  {
    path: path.join(uploadDir, 'media_1794064730755_89901dce.csv'),
    reportNo: 'M 1',
    reportTitle: 'COURSE FILE VERIFICATION REPORT',
    docNumber: 'ZEAL/ZCOER/REPORTS/M-01',
    headerRow: 4,   // 0-indexed line that contains the column headers
  },
  {
    path: path.join(uploadDir, 'media_1794064730756_5e5c7075.csv'),
    reportNo: 'M 2',
    reportTitle: 'INNOVATION ACTIVITY REPORT',
    docNumber: 'ZEAL/ZCOER/REPORTS/M-02',
    headerRow: 4,
  },
  {
    path: path.join(uploadDir, 'media_1794064730756_b766fe96.csv'),
    reportNo: 'M 3',
    reportTitle: 'SUBJECT FEEDBACK REPORT',
    docNumber: 'ZEAL/ZCOER/REPORTS/M-03',
    headerRow: 4,
  },
  {
    path: path.join(uploadDir, 'media_1794064793340_f182faa0.csv'),
    reportNo: 'M 4',
    reportTitle: 'FEEDBACK ANALYSIS REPORT',
    docNumber: 'ZEAL/ZCOER/REPORTS/M-04',
    headerRow: 4,
  },
  {
    path: path.join(uploadDir, 'media_1794064730923_7c28994f.csv'),
    reportNo: 'M 5',
    reportTitle: 'STUDENT ACADEMIC MONITORING REPORT',
    docNumber: 'ZEAL/ZCOER/REPORTS/M-05',
    headerRow: 4,
  },
  {
    path: path.join(uploadDir, 'media_1794065153150_94292e1e.csv'),
    reportNo: 'M 8',
    reportTitle: 'ISO/ ACCREDITATION COMPLIANCE REPORT',
    docNumber: 'ZEAL/ZCOER/REPORTS/M-08',
    headerRow: 4,
  },
  {
    path: path.join(uploadDir, 'media_1794065153150_477b96b8.csv'),
    reportNo: 'M 9',
    reportTitle: 'EDC COORDINATOR REPORT',
    docNumber: 'ZEAL/ZCOER/REPORTS/M-09',
    headerRow: 4,
  },
  {
    path: path.join(uploadDir, 'media_1794065153150_b142b4ca.csv'),
    reportNo: 'M10',
    reportTitle: 'TECHNICAL EVENT COORDINATOR REPORT',
    docNumber: 'ZEAL/ZCOER/REPORTS/M-10',
    headerRow: 4,
  },
  {
    path: path.join(uploadDir, 'media_1794065153149_86050ecc.csv'),
    reportNo: 'M11',
    reportTitle: 'CDP/ STP REPORT',
    docNumber: 'ZEAL/ZCOER/REPORTS/M-11',
    headerRow: 4,
  },
  {
    path: path.join(uploadDir, 'media_1794065153149_f2cb4457.csv'),
    reportNo: 'M12',
    reportTitle: 'SAFETY & COMPLIANCE REPORT',
    docNumber: 'ZEAL/ZCOER/REPORTS/M-12',
    headerRow: 4,
  },
];

// ── Main ───────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  ZCOER Induri - Monthly Report CSV Ingestion');
  console.log('  Period: October 2026 (01-10-2026 to 31-10-2026)');
  console.log('═══════════════════════════════════════════════════\n');

  let totalSubmissions = 0;
  let totalEntries = 0;

  for (const csv of csvFiles) {
    console.log(`── Processing: ${csv.reportNo} - ${csv.reportTitle}`);

    if (!fs.existsSync(csv.path)) {
      console.log(`   ⚠ File not found: ${csv.path} — skipping.\n`);
      continue;
    }

    const rawContent = fs.readFileSync(csv.path, 'utf-8');
    const rawLines = rawContent.split(/\r?\n/);
    const lines = rejoinCSVLines(rawLines);

    // Find the header row (look for "Sr. No." in first column)
    let headerIdx = -1;
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const cols = parseCSVLine(lines[i]);
      const firstNonEmpty = cols.find(c => c.length > 0);
      if (firstNonEmpty && firstNonEmpty.toLowerCase().includes('sr.') ||
          firstNonEmpty && firstNonEmpty.toLowerCase().includes('sr no')) {
        headerIdx = i;
        break;
      }
    }

    if (headerIdx === -1) {
      // Fallback: use the defined headerRow
      headerIdx = csv.headerRow;
    }

    if (headerIdx >= lines.length) {
      console.log(`   ⚠ Header row not found — skipping.\n`);
      continue;
    }

    const headerCols = parseCSVLine(lines[headerIdx]);

    // Parse data rows
    const dataRows = [];
    for (let i = headerIdx + 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);

      // Skip fully empty rows
      const hasContent = cols.some(c => c.length > 0);
      if (!hasContent) continue;

      // Skip rows where the first meaningful column is just an empty
      // serial number with no other data
      const srNo = cols[0] || cols[1] || '';
      const srNum = parseInt(srNo, 10);
      if (isNaN(srNum) && !cols.some((c, idx) => idx > 1 && c.length > 0)) continue;

      // Build a JSON key-value map of this row
      const rowObj = {};
      headerCols.forEach((header, idx) => {
        if (header && cols[idx] !== undefined && cols[idx].trim().length > 0) {
          rowObj[header] = cols[idx].trim();
        }
      });

      // Only include rows that have at least 2 non-empty fields
      if (Object.keys(rowObj).length >= 2) {
        dataRows.push({
          srNo: srNum || dataRows.length + 1,
          rowData: JSON.stringify(rowObj),
        });
      }
    }

    // Check if submission already exists for this report+month
    const existing = await prisma.monthlyReportSubmission.findFirst({
      where: {
        reportNo: csv.reportNo,
        reportMonth: 'October 2026',
      }
    });

    if (existing) {
      // Delete old entries and re-import
      await prisma.monthlyReportEntry.deleteMany({
        where: { submissionId: existing.id }
      });
      await prisma.monthlyReportSubmission.delete({
        where: { id: existing.id }
      });
    }

    // Create submission
    const submission = await prisma.monthlyReportSubmission.create({
      data: {
        reportNo: csv.reportNo,
        reportTitle: csv.reportTitle,
        docNumber: csv.docNumber,
        campus: 'ZCOER INDORI',
        reportMonth: 'October 2026',
        reportPeriod: '01-10-2026 to 31-10-2026',
        department: 'Mechanical Engineering',
        totalEntries: dataRows.length,
        status: dataRows.length > 0 ? 'SUBMITTED' : 'DRAFT',
      },
    });

    // Insert entries
    for (const row of dataRows) {
      await prisma.monthlyReportEntry.create({
        data: {
          submissionId: submission.id,
          srNo: row.srNo,
          rowData: row.rowData,
        },
      });
    }

    const statusLabel = dataRows.length > 0 ? '✅ SUBMITTED' : '📝 DRAFT (empty template)';
    console.log(`   ${statusLabel} — ${dataRows.length} data rows ingested.`);
    totalSubmissions++;
    totalEntries += dataRows.length;
  }

  // Also update the RoleResponsibility status for submitted reports
  for (const csv of csvFiles) {
    const hasData = await prisma.monthlyReportSubmission.findFirst({
      where: { reportNo: csv.reportNo, reportMonth: 'October 2026', status: 'SUBMITTED' }
    });
    if (hasData) {
      await prisma.roleResponsibility.updateMany({
        where: { reportNo: csv.reportNo },
        data: { status: 'SUBMITTED' },
      });
    }
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log(`  Import Summary`);
  console.log(`  Reports Processed: ${totalSubmissions}`);
  console.log(`  Total Data Entries: ${totalEntries}`);
  console.log('═══════════════════════════════════════════════════');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

