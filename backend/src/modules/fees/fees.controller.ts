import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma, CONFIG } from '../../config';
import { AppError } from '../../middleware/errorHandler';
import { FeeService } from '../../services/feeService';

const feeStructureSchema = z.object({
  name: z.string().min(3),
  departmentId: z.string().uuid(),
  programId: z.string().uuid(),
  semester: z.number().int().min(1).max(12),
  academicYear: z.string().min(4),
  dueDate: z.string(),
  lateFeePerDay: z.number().default(50.0),
  components: z.array(
    z.object({
      name: z.string().min(2),
      amount: z.number().positive(),
    })
  ),
});

const paymentSchema = z.object({
  ledgerId: z.string().uuid(),
  amount: z.number().positive(),
  paymentMethod: z.enum(['ONLINE', 'CASH', 'CHEQUE', 'BANK_TRANSFER']),
  transactionId: z.string().optional(),
  notes: z.string().optional(),
});

export class FeesController {
  // --- Fee Structures ---
  static async listStructures(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const structures = await prisma.feeStructure.findMany({
        include: {
          department: true,
          program: true,
          components: true,
          _count: { select: { ledgers: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ success: true, data: structures });
    } catch (error) {
      next(error);
    }
  }

  static async createStructure(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = feeStructureSchema.parse(req.body);
      const totalAmount = data.components.reduce((sum, c) => sum + c.amount, 0);

      const structure = await prisma.feeStructure.create({
        data: {
          name: data.name,
          departmentId: data.departmentId,
          programId: data.programId,
          semester: data.semester,
          academicYear: data.academicYear,
          dueDate: new Date(data.dueDate),
          lateFeePerDay: data.lateFeePerDay,
          totalAmount,
          components: {
            create: data.components,
          },
        },
        include: { components: true },
      });

      res.status(201).json({
        success: true,
        message: 'Fee structure created successfully.',
        data: structure,
      });
    } catch (error) {
      next(error);
    }
  }

  // --- Invoice & Ledger Generation ---
  static async generateInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { feeStructureId } = z.object({ feeStructureId: z.string().uuid() }).parse(req.body);

      const structure = await prisma.feeStructure.findUnique({
        where: { id: feeStructureId },
      });
      if (!structure) throw new AppError('Fee structure not found.', 404);

      // Find all students matching department, program, semester
      const students = await prisma.student.findMany({
        where: {
          departmentId: structure.departmentId,
          programId: structure.programId,
          currentSemester: structure.semester,
          academicStatus: 'ACTIVE',
        },
      });

      const generatedLedgers = [];

      for (const student of students) {
        // Check if ledger already exists
        const existing = await prisma.studentFeeLedger.findFirst({
          where: { studentId: student.id, feeStructureId: structure.id },
        });

        if (existing) continue;

        const invoiceNumber = FeeService.generateInvoiceNumber(
          CONFIG.COLLEGE_CODE,
          structure.semester
        );

        const ledger = await prisma.studentFeeLedger.create({
          data: {
            studentId: student.id,
            feeStructureId: structure.id,
            invoiceNumber,
            baseAmount: structure.totalAmount,
            discountAmount: 0.0,
            penaltyAmount: 0.0,
            totalDue: structure.totalAmount,
            amountPaid: 0.0,
            balanceDue: structure.totalAmount,
            paymentStatus: 'PENDING',
            dueDate: structure.dueDate,
          },
        });

        generatedLedgers.push(ledger);
      }

      res.json({
        success: true,
        message: `Generated ${generatedLedgers.length} fee invoices.`,
        data: generatedLedgers,
      });
    } catch (error) {
      next(error);
    }
  }

  // --- Payment Processing (ACID Transaction) ---
  static async recordPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = paymentSchema.parse(req.body);

      const ledger = await prisma.studentFeeLedger.findUnique({
        where: { id: data.ledgerId },
        include: { feeStructure: true },
      });

      if (!ledger) throw new AppError('Fee ledger record not found.', 404);

      // Recalculate up-to-date dues with penalty
      const updatedCalculation = FeeService.calculateLedger({
        baseAmount: ledger.baseAmount,
        discountAmount: ledger.discountAmount,
        dueDate: ledger.dueDate,
        lateFeePerDay: ledger.feeStructure.lateFeePerDay,
        amountPaid: ledger.amountPaid + data.amount,
      });

      const receiptNumber = FeeService.generateReceiptNumber(CONFIG.COLLEGE_CODE);
      const transactionId = data.transactionId || `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // Execute payment and ledger update in an atomic ACID transaction
      const [payment, updatedLedger] = await prisma.$transaction([
        prisma.feePayment.create({
          data: {
            ledgerId: ledger.id,
            studentId: ledger.studentId,
            transactionId,
            receiptNumber,
            amount: data.amount,
            paymentMethod: data.paymentMethod,
            status: 'COMPLETED',
            collectedBy: req.user?.id,
            notes: data.notes,
          },
        }),
        prisma.studentFeeLedger.update({
          where: { id: ledger.id },
          data: {
            amountPaid: updatedCalculation.amountPaid,
            penaltyAmount: updatedCalculation.penaltyAmount,
            totalDue: updatedCalculation.totalDue,
            balanceDue: updatedCalculation.balanceDue,
            paymentStatus: updatedCalculation.paymentStatus,
          },
        }),
      ]);

      res.status(201).json({
        success: true,
        message: 'Payment recorded and ledger updated.',
        data: {
          payment,
          ledger: updatedLedger,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // --- Student Ledgers / Dues Listing ---
  static async listStudentLedgers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { studentId, status } = req.query;
      const where: any = {};

      if (req.user?.role === 'STUDENT') {
        where.studentId = req.user.studentId;
      } else if (studentId) {
        where.studentId = String(studentId);
      }

      if (status) where.paymentStatus = String(status);

      const ledgers = await prisma.studentFeeLedger.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              rollNumber: true,
              department: true,
            },
          },
          feeStructure: { include: { components: true } },
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      // Recalculate late fees dynamically if overdue
      const evaluated = ledgers.map((l) => {
        const calc = FeeService.calculateLedger({
          baseAmount: l.baseAmount,
          discountAmount: l.discountAmount,
          dueDate: l.dueDate,
          lateFeePerDay: l.feeStructure.lateFeePerDay,
          amountPaid: l.amountPaid,
        });
        return {
          ...l,
          evaluatedStatus: calc.paymentStatus,
          livePenalty: calc.penaltyAmount,
          liveBalanceDue: calc.balanceDue,
          overdueDays: calc.overdueDays,
        };
      });

      res.json({ success: true, count: evaluated.length, data: evaluated });
    } catch (error) {
      next(error);
    }
  }
}
