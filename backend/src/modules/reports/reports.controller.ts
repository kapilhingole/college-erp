import { Request, Response, NextFunction } from 'express';
import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import { prisma, CONFIG } from '../../config';
import { AttendanceAlertService } from '../../services/attendanceAlertService';
import { FeeService } from '../../services/feeService';
import { AppError } from '../../middleware/errorHandler';

export class ReportsController {
  // Export Attendance Defaulters to Excel
  static async exportAttendanceDefaultersExcel(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const minThreshold = CONFIG.ATTENDANCE_MIN_THRESHOLD;
      const students = await prisma.student.findMany({
        where: { academicStatus: 'ACTIVE' },
        include: {
          department: true,
          program: true,
          section: true,
          attendanceRecords: {
            include: { lectureSession: { include: { subject: true } } },
          },
        },
      });

      const defaulterRows: any[] = [];

      for (const student of students) {
        const evalRes = AttendanceAlertService.evaluateStudentAttendance(
          student.id,
          student.attendanceRecords as any,
          minThreshold
        );

        if (evalRes.isOverallDefaulter) {
          defaulterRows.push({
            'Roll Number': student.rollNumber,
            'Enrollment No': student.enrollmentNumber,
            'Student Name': `${student.firstName} ${student.lastName}`,
            'Department': student.department.name,
            'Program': student.program.name,
            'Semester': student.currentSemester,
            'Section': student.section?.name || 'N/A',
            'Total Lectures': evalRes.totalLectures,
            'Lectures Attended': evalRes.totalAttended,
            'Attendance (%)': evalRes.overallPercentage,
            'Shortfall (%)': Number((minThreshold - evalRes.overallPercentage).toFixed(2)),
            'Status': 'CRITICAL DEFAULTER (<75%)',
          });
        }
      }

      const worksheet = XLSX.utils.json_to_sheet(defaulterRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Defaulters');

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=attendance_defaulters_${Date.now()}.xlsx`
      );
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  // Export Fee Dues & Defaulters to Excel
  static async exportFeeDefaultersExcel(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const ledgers = await prisma.studentFeeLedger.findMany({
        where: { balanceDue: { gt: 0 } },
        include: {
          student: {
            include: { department: true, program: true },
          },
          feeStructure: true,
        },
      });

      const dataRows = ledgers.map((l) => {
        const calc = FeeService.calculateLedger({
          baseAmount: l.baseAmount,
          discountAmount: l.discountAmount,
          dueDate: l.dueDate,
          lateFeePerDay: l.feeStructure.lateFeePerDay,
          amountPaid: l.amountPaid,
        });

        return {
          'Invoice Number': l.invoiceNumber,
          'Roll Number': l.student.rollNumber,
          'Student Name': `${l.student.firstName} ${l.student.lastName}`,
          'Department': l.student.department.name,
          'Program': l.student.program.name,
          'Fee Plan': l.feeStructure.name,
          'Due Date': new Date(l.dueDate).toLocaleDateString(),
          'Base Amount (₹)': l.baseAmount,
          'Late Penalty (₹)': calc.penaltyAmount,
          'Total Due (₹)': calc.totalDue,
          'Amount Paid (₹)': l.amountPaid,
          'Balance Pending (₹)': calc.balanceDue,
          'Days Overdue': calc.overdueDays,
          'Payment Status': calc.paymentStatus,
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(dataRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Fee Defaulters');

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=fee_defaulters_${Date.now()}.xlsx`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  // Generate Official PDF Report Card
  static async generateReportCardPdf(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { studentId, semester } = req.params;
      const semNum = parseInt(semester, 10);

      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          department: true,
          program: true,
          batch: true,
          section: true,
          marksEntries: {
            where: { examSchedule: { subject: { semester: semNum } } },
            include: { examSchedule: { include: { subject: true } } },
          },
          semesterResults: { where: { semester: semNum } },
        },
      });

      if (!student) throw new AppError('Student not found.', 404);

      const doc = new PDFDocument({ margin: 40 });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=report_card_${student.rollNumber}_sem${semNum}.pdf`
      );

      doc.pipe(res);

      // Institution Header
      doc.fontSize(18).text(CONFIG.COLLEGE_NAME, { align: 'center' });
      doc.fontSize(12).text('OFFICIAL GRADE REPORT / TRANSCRIPT', { align: 'center' });
      doc.fontSize(10).text(`Semester ${semNum} Examination`, { align: 'center' });
      doc.moveDown(1.5);

      // Student Metadata
      doc.rect(40, 110, 530, 80).stroke();
      doc.fontSize(10);
      doc.text(`Student Name: ${student.firstName} ${student.lastName}`, 50, 120);
      doc.text(`Roll Number: ${student.rollNumber}`, 320, 120);
      doc.text(`Enrollment No: ${student.enrollmentNumber}`, 50, 140);
      doc.text(`Department: ${student.department.name}`, 320, 140);
      doc.text(`Program: ${student.program.name}`, 50, 160);
      doc.text(`Batch: ${student.batch.name}`, 320, 160);
      doc.moveDown(3);

      // Table Header
      let y = 210;
      doc.rect(40, y, 530, 22).fillAndStroke('#e2e8f0', '#94a3b8');
      doc.fillColor('#000').font('Helvetica-Bold').fontSize(9);
      doc.text('Code', 45, y + 6);
      doc.text('Subject Name', 110, y + 6);
      doc.text('Credits', 310, y + 6);
      doc.text('Internal', 360, y + 6);
      doc.text('Theory', 415, y + 6);
      doc.text('Total', 470, y + 6);
      doc.text('Grade', 520, y + 6);

      // Table Rows
      y += 24;
      doc.font('Helvetica').fontSize(9);

      for (const m of student.marksEntries) {
        doc.rect(40, y, 530, 20).stroke('#cbd5e1');
        doc.text(m.examSchedule.subject.code, 45, y + 5);
        doc.text(m.examSchedule.subject.name.slice(0, 32), 110, y + 5);
        doc.text(String(m.examSchedule.subject.credits), 325, y + 5);
        doc.text(String(m.internalMarks), 375, y + 5);
        doc.text(String(m.theoryMarks), 430, y + 5);
        doc.text(String(m.totalMarks), 480, y + 5);
        doc.text(m.letterGrade, 530, y + 5);
        y += 20;
      }

      // Summary Box
      const summary = student.semesterResults[0];
      y += 20;
      doc.rect(40, y, 530, 50).fillAndStroke('#f1f5f9', '#64748b');
      doc.fillColor('#000').font('Helvetica-Bold').fontSize(10);
      doc.text(`SGPA: ${summary?.sgpa?.toFixed(2) || 'N/A'}`, 60, y + 18);
      doc.text(`CGPA: ${summary?.cgpa?.toFixed(2) || 'N/A'}`, 180, y + 18);
      doc.text(`Credits Earned: ${summary?.earnedCredits || 0} / ${summary?.totalCredits || 0}`, 300, y + 18);
      doc.text(`Result: ${summary?.resultStatus || 'PENDING'}`, 450, y + 18);

      // Footer
      doc.fontSize(8).font('Helvetica').text(
        `Generated on ${new Date().toLocaleString()} | Authenticated Digital Record`,
        40,
        750,
        { align: 'center' }
      );

      doc.end();
    } catch (error) {
      next(error);
    }
  }

  // Generate Fee Payment Receipt PDF
  static async generateFeeReceiptPdf(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { paymentId } = req.params;

      const payment = await prisma.feePayment.findUnique({
        where: { id: paymentId },
        include: {
          ledger: {
            include: {
              student: { include: { department: true, program: true } },
              feeStructure: true,
            },
          },
        },
      });

      if (!payment) throw new AppError('Payment receipt not found.', 404);

      const doc = new PDFDocument({ margin: 40 });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=receipt_${payment.receiptNumber}.pdf`);

      doc.pipe(res);

      doc.fontSize(18).text(CONFIG.COLLEGE_NAME, { align: 'center' });
      doc.fontSize(12).text('OFFICIAL FEE PAYMENT RECEIPT', { align: 'center' });
      doc.moveDown(1);

      doc.rect(40, 90, 530, 160).stroke('#64748b');
      doc.fontSize(10);
      doc.text(`Receipt Number: ${payment.receiptNumber}`, 50, 105);
      doc.text(`Date: ${new Date(payment.paymentDate).toLocaleDateString()}`, 350, 105);
      doc.text(`Transaction ID: ${payment.transactionId}`, 50, 125);
      doc.text(`Payment Mode: ${payment.paymentMethod}`, 350, 125);

      doc.text(`Student: ${payment.ledger.student.firstName} ${payment.ledger.student.lastName}`, 50, 155);
      doc.text(`Roll Number: ${payment.ledger.student.rollNumber}`, 350, 155);
      doc.text(`Department: ${payment.ledger.student.department.name}`, 50, 175);
      doc.text(`Program: ${payment.ledger.student.program.name}`, 350, 175);
      doc.text(`Fee Category: ${payment.ledger.feeStructure.name}`, 50, 195);
      doc.text(`Invoice No: ${payment.ledger.invoiceNumber}`, 350, 195);

      doc.rect(40, 270, 530, 45).fillAndStroke('#dcfce7', '#16a34a');
      doc.fillColor('#15803d').font('Helvetica-Bold').fontSize(14);
      doc.text(`AMOUNT RECEIVED: ₹${payment.amount.toFixed(2)}`, 60, 285);

      doc.fillColor('#000').font('Helvetica').fontSize(9);
      doc.text(`Remaining Balance on Ledger: ₹${payment.ledger.balanceDue.toFixed(2)}`, 60, 330);
      doc.text(
        `This is a computer generated receipt authorized by the college finance office. No physical signature required.`,
        40,
        500,
        { align: 'center' }
      );

      doc.end();
    } catch (error) {
      next(error);
    }
  }
}
