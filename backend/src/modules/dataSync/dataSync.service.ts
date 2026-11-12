import * as XLSX from 'xlsx';
const { PDFParse } = require('pdf-parse');
import bcrypt from 'bcryptjs';
import { prisma } from '../../config';
import { ZprnService } from '../../services/zprnService';

export interface DataSyncResult {
  fileName: string;
  fileType: 'EXCEL' | 'CSV' | 'PDF';
  detectedEntity: 'STUDENTS' | 'FACULTY' | 'MARKS' | 'FEES' | 'ATTENDANCE';
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errors: { row: number; identifier?: string; reason: string }[];
  details: any[];
}

export class DataSyncService {
  /**
   * Parse incoming file (PDF, Excel, or CSV) into uniform array of row objects
   */
  static async parseFile(fileBuffer: Buffer, fileName: string): Promise<{ rows: any[]; fileType: 'EXCEL' | 'CSV' | 'PDF' }> {
    const ext = fileName.toLowerCase().split('.').pop() || '';

    if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      // Clean headers and keys: remove spaces, lowercase, etc.
      const cleanedRows = rawRows.map((r) => {
        const cleaned: Record<string, any> = {};
        Object.entries(r).forEach(([key, val]) => {
          cleaned[key.trim()] = typeof val === 'string' ? val.trim() : val;
        });
        return cleaned;
      });

      return {
        rows: cleanedRows,
        fileType: ext === 'csv' ? 'CSV' : 'EXCEL',
      };
    } else if (ext === 'pdf') {
      let text = '';
      try {
        const parser = new PDFParse({ data: fileBuffer });
        const res = await parser.getText();
        text = typeof res === 'string' ? res : res?.text || '';
        await parser.destroy();
      } catch (err) {
        text = fileBuffer.toString('utf-8');
      }
      const rows = this.parsePdfTextToRows(text);
      return {
        rows,
        fileType: 'PDF',
      };
    } else {
      throw new Error(`Unsupported file format .${ext}. Only PDF (.pdf), Excel (.xlsx, .xls), and CSV (.csv) are supported.`);
    }
  }

  /**
   * Parse extracted raw text from PDF into structured tabular rows
   */
  private static parsePdfTextToRows(text: string): any[] {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const rows: any[] = [];
    let headers: string[] = [];
    let headerFound = false;

    // Standard header terms to identify table start
    const knownHeaderTerms = ['prn', 'roll', 'name', 'email', 'dept', 'semester', 'branch', 'mark', 'fee', 'employee'];

    for (const line of lines) {
      // Split line by tab, pipe, comma, or 2+ consecutive spaces
      let columns = line.includes('\t')
        ? line.split('\t')
        : line.includes('|')
        ? line.split('|')
        : line.includes(',')
        ? line.split(',')
        : line.split(/\s{2,}/);

      columns = columns.map((c) => c.trim()).filter((c) => c.length > 0);

      if (columns.length < 2) {
        // Check for semi-structured "Key: Value" lines
        if (line.includes(':')) {
          const parts = line.split(':');
          const key = parts[0].trim();
          const val = parts.slice(1).join(':').trim();
          if (rows.length > 0) {
            rows[rows.length - 1][key] = val;
          }
        }
        continue;
      }

      // Detect header row
      if (!headerFound) {
        const lineLower = line.toLowerCase();
        const matchesTerm = knownHeaderTerms.some((t) => lineLower.includes(t));

        if (matchesTerm) {
          headers = columns.map((c) => c.replace(/[^a-zA-Z0-9]/g, ''));
          headerFound = true;
          continue;
        }
      }

      // If headers exist, map columns to headers
      if (headerFound && headers.length > 0) {
        const rowObj: Record<string, any> = {};
        columns.forEach((val, idx) => {
          const headerName = headers[idx] || `Column_${idx + 1}`;
          rowObj[headerName] = val;
        });
        rows.push(rowObj);
      } else {
        // Fallback: positional object
        const rowObj: Record<string, any> = {};
        columns.forEach((val, idx) => {
          rowObj[`col_${idx + 1}`] = val;
        });
        rows.push(rowObj);
      }
    }

    return rows;
  }

  /**
   * Auto-detect entity type from row keys
   */
  static detectEntityType(rows: any[]): 'STUDENTS' | 'FACULTY' | 'MARKS' | 'FEES' | 'ATTENDANCE' {
    if (!rows || rows.length === 0) return 'STUDENTS';

    const sample = rows[0];
    const keys = Object.keys(sample).map((k) => k.toLowerCase());

    if (keys.some((k) => k.includes('mark') || k.includes('grade') || k.includes('internal') || k.includes('external'))) {
      return 'MARKS';
    }
    if (keys.some((k) => k.includes('fee') || k.includes('invoice') || k.includes('amountpaid') || k.includes('dueamount'))) {
      return 'FEES';
    }
    if (keys.some((k) => k.includes('attendance') || k.includes('present') || k.includes('lecture') || k.includes('session'))) {
      return 'ATTENDANCE';
    }
    if (keys.some((k) => k.includes('employee') || k.includes('designation') || k.includes('qualification'))) {
      return 'FACULTY';
    }

    return 'STUDENTS';
  }

  /**
   * Synchronize / Upsert Student Records
   */
  static async syncStudents(rows: any[], fileName: string, fileType: 'EXCEL' | 'CSV' | 'PDF'): Promise<DataSyncResult> {
    const departments = await prisma.department.findMany({
      include: { programs: { include: { batches: { include: { sections: true } }, feeStructures: true } } },
    });
    const deptMap = new Map<string, any>();
    departments.forEach((d) => {
      deptMap.set(d.code.toUpperCase().trim(), d);
      deptMap.set(d.name.toUpperCase().trim(), d);
    });

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: { row: number; identifier?: string; reason: string }[] = [];
    const details: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      // Extract fields flexibly
      const prn = String(
        row.PRN || row.EnrollmentNumber || row.enrollmentNumber || row.prn || row.ZPRN || row.zprn || ''
      ).trim();
      const rollNumber = String(row.RollNumber || row.rollNumber || row.RollNo || row.roll || prn).trim();
      const firstName = String(row.FirstName || row.firstName || row.Firstname || row.Name || '').split(' ')[0].trim();
      const lastName = String(
        row.LastName || row.lastName || row.Lastname || (String(row.Name || '').split(' ').slice(1).join(' ')) || 'Student'
      ).trim();
      const email = String(
        row.Email || row.email || row.LoginEmail || row.institutionalEmail || `${rollNumber.toLowerCase()}@student.zeal.edu.in`
      ).toLowerCase().trim();
      const phone = String(row.Phone || row.phone || row.Mobile || '9800000000').trim();
      const deptCode = String(row.DepartmentCode || row.departmentCode || row.Department || row.Branch || 'COMP').toUpperCase().trim();
      const semester = parseInt(String(row.Semester || row.semester || row.currentSemester || 1), 10) || 1;
      const sectionName = String(row.SectionName || row.sectionName || row.Section || row.Division || 'Division A').trim();
      const academicStatus = String(row.Status || row.status || row.academicStatus || 'ACTIVE').toUpperCase().trim();
      const password = String(row.Password || row.password || 'Student@123').trim();

      if (!prn && !rollNumber && !email) {
        skippedCount++;
        errors.push({ row: rowNum, reason: 'Row missing all primary identifiers (PRN, Roll Number, and Email)' });
        continue;
      }

      // Check if student exists
      const existingStudent = await prisma.student.findFirst({
        where: {
          OR: [
            ...(prn ? [{ enrollmentNumber: prn }] : []),
            ...(rollNumber ? [{ rollNumber }] : []),
            ...(email ? [{ email }] : []),
          ],
        },
        include: { user: true },
      });

      const matchedDept = deptMap.get(deptCode) || departments[0];
      const matchedProg = matchedDept?.programs?.[0];
      const matchedBatch = matchedProg?.batches?.[0];
      const matchedSec = matchedBatch?.sections?.find((s: any) => s.name.toLowerCase() === sectionName.toLowerCase()) || matchedBatch?.sections?.[0];

      if (existingStudent) {
        // UPDATE existing student record
        await prisma.student.update({
          where: { id: existingStudent.id },
          data: {
            currentSemester: semester,
            phone: phone !== '9800000000' ? phone : existingStudent.phone,
            academicStatus: ['ACTIVE', 'ALUMNI', 'SUSPENDED'].includes(academicStatus) ? academicStatus : existingStudent.academicStatus,
            sectionId: matchedSec?.id || existingStudent.sectionId,
            ...(matchedDept ? { departmentId: matchedDept.id } : {}),
            ...(matchedProg ? { programId: matchedProg.id } : {}),
            ...(matchedBatch ? { batchId: matchedBatch.id } : {}),
          },
        });

        if (existingStudent.userId && password !== 'Student@123') {
          const passwordHash = await bcrypt.hash(password, 10);
          await prisma.user.update({
            where: { id: existingStudent.userId },
            data: { passwordHash },
          });
        }

        updatedCount++;
        details.push({
          action: 'UPDATED',
          id: existingStudent.id,
          name: `${existingStudent.firstName} ${existingStudent.lastName}`,
          prn: existingStudent.enrollmentNumber,
          semester,
        });
      } else {
        // INSERT new student record
        if (!firstName) {
          skippedCount++;
          errors.push({ row: rowNum, identifier: prn || rollNumber, reason: 'Student first name required for new admission' });
          continue;
        }

        const effectivePrn = prn || (await ZprnService.allocateNextZprn());
        const passwordHash = await bcrypt.hash(password, 10);

        const newStudent = await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              email,
              passwordHash,
              role: 'STUDENT',
              status: 'ACTIVE',
            },
          });

          const student = await tx.student.create({
            data: {
              userId: user.id,
              rollNumber: rollNumber || `${deptCode}-001`,
              enrollmentNumber: effectivePrn,
              firstName,
              lastName,
              email,
              phone,
              dateOfBirth: new Date('2005-01-01'),
              gender: 'MALE',
              departmentId: matchedDept?.id || departments[0].id,
              programId: matchedProg?.id || departments[0].programs[0].id,
              batchId: matchedBatch?.id || departments[0].programs[0].batches[0].id,
              sectionId: matchedSec?.id || null,
              currentSemester: semester,
              academicStatus: 'ACTIVE',
            },
          });

          const feeStructure = matchedProg?.feeStructures?.[0];
          if (feeStructure) {
            const invoiceNumber = `INV-${new Date().getFullYear()}-${student.enrollmentNumber}`;
            await tx.studentFeeLedger.create({
              data: {
                studentId: student.id,
                feeStructureId: feeStructure.id,
                invoiceNumber,
                baseAmount: feeStructure.totalAmount,
                totalDue: feeStructure.totalAmount,
                amountPaid: 0,
                balanceDue: feeStructure.totalAmount,
                paymentStatus: 'PENDING',
                dueDate: feeStructure.dueDate || new Date('2024-12-31'),
              },
            });
          }

          return student;
        });

        createdCount++;
        details.push({
          action: 'CREATED',
          id: newStudent.id,
          name: `${newStudent.firstName} ${newStudent.lastName}`,
          prn: newStudent.enrollmentNumber,
          semester,
        });
      }
    }

    return {
      fileName,
      fileType,
      detectedEntity: 'STUDENTS',
      totalRows: rows.length,
      createdCount,
      updatedCount,
      skippedCount,
      errors,
      details,
    };
  }

  /**
   * Synchronize / Upsert Examination Marks & Grades
   */
  static async syncMarks(rows: any[], fileName: string, fileType: 'EXCEL' | 'CSV' | 'PDF'): Promise<DataSyncResult> {
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: { row: number; identifier?: string; reason: string }[] = [];
    const details: any[] = [];

    // Preload subjects and exams
    const subjects = await prisma.subject.findMany();
    const subMap = new Map<string, any>();
    subjects.forEach((s) => subMap.set(s.code.toUpperCase().trim(), s));

    const exam = (await prisma.exam.findFirst({ where: { isPublished: true } })) || (await prisma.exam.findFirst());
    if (!exam) {
      throw new Error('No exam cycles exist in the portal. Please create an Exam Cycle under Academics first.');
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      const prn = String(row.PRN || row.EnrollmentNumber || row.prn || '').trim();
      const rollNumber = String(row.RollNumber || row.rollNumber || row.RollNo || '').trim();
      const subjectCode = String(row.SubjectCode || row.subjectCode || row.Subject || 'CS301').toUpperCase().trim();
      const internalMarks = parseFloat(String(row.InternalMarks || row.internalMarks || row.Internal || 0)) || 0;
      const externalMarks = parseFloat(String(row.ExternalMarks || row.externalMarks || row.External || row.Theory || 0)) || 0;
      const totalMarks = internalMarks + externalMarks;

      if (!prn && !rollNumber) {
        skippedCount++;
        errors.push({ row: rowNum, reason: 'Row missing student PRN or Roll Number' });
        continue;
      }

      const student = await prisma.student.findFirst({
        where: {
          OR: [...(prn ? [{ enrollmentNumber: prn }] : []), ...(rollNumber ? [{ rollNumber }] : [])],
        },
      });

      if (!student) {
        skippedCount++;
        errors.push({ row: rowNum, identifier: prn || rollNumber, reason: 'Student not found in portal database' });
        continue;
      }

      const subject = subMap.get(subjectCode) || subjects[0];
      if (!subject) {
        skippedCount++;
        errors.push({ row: rowNum, identifier: subjectCode, reason: `Subject ${subjectCode} not found in curriculum` });
        continue;
      }

      // Find or create ExamSchedule for subject
      let schedule = await prisma.examSchedule.findFirst({
        where: { examId: exam.id, subjectId: subject.id },
      });

      if (!schedule) {
        schedule = await prisma.examSchedule.create({
          data: {
            examId: exam.id,
            subjectId: subject.id,
            examDate: new Date(),
            startTime: '10:00 AM',
            endTime: '01:00 PM',
            roomNumber: 'Hall A',
            maxMarks: subject.totalMarks || 100,
          },
        });
      }

      // Upsert marks entry
      const percentage = (totalMarks / (schedule.maxMarks || 100)) * 100;
      const letterGrade =
        percentage >= 90
          ? 'O'
          : percentage >= 80
          ? 'A+'
          : percentage >= 70
          ? 'A'
          : percentage >= 60
          ? 'B+'
          : percentage >= 50
          ? 'B'
          : percentage >= 40
          ? 'C'
          : 'F';
      const status = percentage >= 40 ? 'PASS' : 'FAIL';

      const existingEntry = await prisma.marksEntry.findUnique({
        where: {
          examScheduleId_studentId: {
            examScheduleId: schedule.id,
            studentId: student.id,
          },
        },
      });

      if (existingEntry) {
        await prisma.marksEntry.update({
          where: { id: existingEntry.id },
          data: { internalMarks, theoryMarks: externalMarks, totalMarks, percentage, letterGrade, status },
        });
        updatedCount++;
      } else {
        await prisma.marksEntry.create({
          data: {
            examScheduleId: schedule.id,
            studentId: student.id,
            internalMarks,
            theoryMarks: externalMarks,
            totalMarks,
            percentage,
            letterGrade,
            status,
          },
        });
        createdCount++;
      }

      details.push({
        action: existingEntry ? 'UPDATED' : 'CREATED',
        student: `${student.firstName} ${student.lastName}`,
        subject: subject.code,
        marks: `${totalMarks}/${schedule.maxMarks}`,
        grade: letterGrade,
      });
    }

    return {
      fileName,
      fileType,
      detectedEntity: 'MARKS',
      totalRows: rows.length,
      createdCount,
      updatedCount,
      skippedCount,
      errors,
      details,
    };
  }

  /**
   * Synchronize / Upsert Fee Receipts & Ledger Status
   */
  static async syncFees(rows: any[], fileName: string, fileType: 'EXCEL' | 'CSV' | 'PDF'): Promise<DataSyncResult> {
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: { row: number; identifier?: string; reason: string }[] = [];
    const details: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      const prn = String(row.PRN || row.EnrollmentNumber || row.prn || '').trim();
      const rollNumber = String(row.RollNumber || row.rollNumber || row.RollNo || '').trim();
      const amountPaid = parseFloat(String(row.AmountPaid || row.amountPaid || row.Amount || row.Paid || 0)) || 0;
      const transactionId = String(row.TransactionId || row.transactionId || row.TransactionRef || `TXN-${Date.now()}-${i}`).trim();

      if (!prn && !rollNumber) {
        skippedCount++;
        errors.push({ row: rowNum, reason: 'Missing PRN or Roll Number' });
        continue;
      }

      const student = await prisma.student.findFirst({
        where: {
          OR: [...(prn ? [{ enrollmentNumber: prn }] : []), ...(rollNumber ? [{ rollNumber }] : [])],
        },
        include: { feeLedgers: true },
      });

      if (!student) {
        skippedCount++;
        errors.push({ row: rowNum, identifier: prn || rollNumber, reason: 'Student not found in database' });
        continue;
      }

      const ledger = student.feeLedgers[0];
      if (!ledger) {
        skippedCount++;
        errors.push({ row: rowNum, identifier: student.enrollmentNumber, reason: 'Student has no active fee ledger invoice' });
        continue;
      }

      const newAmountPaid = ledger.amountPaid + amountPaid;
      const newBalance = Math.max(0, ledger.totalDue - newAmountPaid);
      const newStatus = newBalance === 0 ? 'PAID' : newAmountPaid > 0 ? 'PARTIALLY_PAID' : 'PENDING';

      await prisma.$transaction(async (tx) => {
        await tx.studentFeeLedger.update({
          where: { id: ledger.id },
          data: {
            amountPaid: newAmountPaid,
            balanceDue: newBalance,
            paymentStatus: newStatus,
          },
        });

        await tx.feePayment.create({
          data: {
            ledgerId: ledger.id,
            studentId: student.id,
            transactionId,
            receiptNumber: `RCP-${Date.now().toString().slice(-6)}-${i + 1}`,
            amount: amountPaid,
            paymentMethod: 'ONLINE_PORTAL',
            status: 'COMPLETED',
            paymentDate: new Date(),
          },
        });
      });

      updatedCount++;
      details.push({
        action: 'PAYMENT_RECORDED',
        student: `${student.firstName} ${student.lastName}`,
        prn: student.enrollmentNumber,
        paid: amountPaid,
        remainingBalance: newBalance,
        status: newStatus,
      });
    }

    return {
      fileName,
      fileType,
      detectedEntity: 'FEES',
      totalRows: rows.length,
      createdCount,
      updatedCount,
      skippedCount,
      errors,
      details,
    };
  }
}
