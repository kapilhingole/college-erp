import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma, CONFIG } from '../../config';
import { AppError } from '../../middleware/errorHandler';
import { LibraryFineService } from '../../services/libraryFineService';

const bookSchema = z.object({
  isbn: z.string().min(5),
  title: z.string().min(2),
  author: z.string().min(2),
  publisher: z.string().optional(),
  category: z.string().min(2),
  edition: z.string().optional(),
  totalCopies: z.number().int().min(1).default(1),
  shelfLocation: z.string().optional(),
});

const issueBookSchema = z.object({
  bookId: z.string().uuid(),
  studentId: z.string().uuid(),
  borrowDays: z.number().int().min(1).max(60).default(14),
});

export class LibraryController {
  // --- Book Catalog ---
  static async listBooks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { category, search } = req.query;
      const where: any = {};

      if (category) where.category = String(category);
      if (search) {
        const query = String(search).trim();
        where.OR = [
          { title: { contains: query } },
          { author: { contains: query } },
          { isbn: { contains: query } },
          { category: { contains: query } },
        ];
      }

      const books = await prisma.book.findMany({
        where,
        orderBy: { title: 'asc' },
      });

      res.json({ success: true, count: books.length, data: books });
    } catch (error) {
      next(error);
    }
  }

  static async addBook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = bookSchema.parse(req.body);
      const book = await prisma.book.create({
        data: {
          ...data,
          availableCopies: data.totalCopies,
        },
      });
      res.status(201).json({ success: true, message: 'Book added to catalog.', data: book });
    } catch (error) {
      next(error);
    }
  }

  // --- Issue Book (ACID Transaction) ---
  static async issueBook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { bookId, studentId, borrowDays } = issueBookSchema.parse(req.body);

      const book = await prisma.book.findUnique({ where: { id: bookId } });
      if (!book) throw new AppError('Book not found in library.', 404);
      if (book.availableCopies <= 0) {
        throw new AppError('No copies currently available for borrowing.', 400);
      }

      const student = await prisma.student.findUnique({ where: { id: studentId } });
      if (!student) throw new AppError('Student not found.', 404);

      // Check active unreturned books count (limit to 4 books)
      const activeIssuesCount = await prisma.bookIssueRecord.count({
        where: { studentId, status: { in: ['ISSUED', 'OVERDUE'] } },
      });
      if (activeIssuesCount >= 4) {
        throw new AppError('Student has reached maximum allowed borrowing limit (4 books).', 400);
      }

      const issueDate = new Date();
      const dueDate = LibraryFineService.getDefaultDueDate(issueDate, borrowDays);

      // Atomic transaction: create issue record and decrement available copies
      const [issueRecord] = await prisma.$transaction([
        prisma.bookIssueRecord.create({
          data: {
            bookId,
            studentId,
            issueDate,
            dueDate,
            status: 'ISSUED',
            issuedBy: req.user?.id,
          },
          include: { book: true, student: true },
        }),
        prisma.book.update({
          where: { id: bookId },
          data: { availableCopies: { decrement: 1 } },
        }),
      ]);

      res.status(201).json({
        success: true,
        message: 'Book issued successfully.',
        data: issueRecord,
      });
    } catch (error) {
      next(error);
    }
  }

  // --- Return Book & Calculate Fine (ACID Transaction) ---
  static async returnBook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { issueRecordId } = req.params;
      const { finePaid = false } = req.body;

      const record = await prisma.bookIssueRecord.findUnique({
        where: { id: issueRecordId },
        include: { book: true },
      });

      if (!record) throw new AppError('Borrowing record not found.', 404);
      if (record.status === 'RETURNED') {
        throw new AppError('This book has already been returned.', 400);
      }

      const returnDate = new Date();
      const fineCalc = LibraryFineService.calculateFine({
        issueDate: record.issueDate,
        dueDate: record.dueDate,
        returnDate,
        dailyFineRate: CONFIG.LIBRARY_FINE_PER_DAY,
        finePaid,
      });

      // Atomic transaction: mark returned, record fine, and increment available copies
      const [updatedRecord] = await prisma.$transaction([
        prisma.bookIssueRecord.update({
          where: { id: record.id },
          data: {
            returnDate,
            status: 'RETURNED',
            overdueDays: fineCalc.overdueDays,
            fineAmount: fineCalc.fineAmount,
            finePaid,
            returnedTo: req.user?.id,
          },
        }),
        prisma.book.update({
          where: { id: record.bookId },
          data: { availableCopies: { increment: 1 } },
        }),
      ]);

      res.json({
        success: true,
        message:
          fineCalc.fineAmount > 0
            ? `Book returned. Overdue fine: ₹${fineCalc.fineAmount} (${fineCalc.overdueDays} days late).`
            : 'Book returned on time with zero fines.',
        data: updatedRecord,
      });
    } catch (error) {
      next(error);
    }
  }

  // --- List Issues (active or historical) ---
  static async listIssues(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { studentId, status } = req.query;
      const where: any = {};

      if (req.user?.role === 'STUDENT') {
        where.studentId = req.user.studentId;
      } else if (studentId) {
        where.studentId = String(studentId);
      }

      if (status) where.status = String(status);

      const records = await prisma.bookIssueRecord.findMany({
        where,
        include: {
          book: true,
          student: {
            select: { id: true, firstName: true, lastName: true, rollNumber: true },
          },
        },
        orderBy: { issueDate: 'desc' },
      });

      // Recalculate live fine for unreturned books
      const evaluated = records.map((r) => {
        if (r.status === 'RETURNED') return r;
        const fine = LibraryFineService.calculateFine({
          issueDate: r.issueDate,
          dueDate: r.dueDate,
          dailyFineRate: CONFIG.LIBRARY_FINE_PER_DAY,
        });
        return {
          ...r,
          liveOverdueDays: fine.overdueDays,
          liveFineAmount: fine.fineAmount,
          isOverdue: fine.isOverdue,
        };
      });

      res.json({ success: true, count: evaluated.length, data: evaluated });
    } catch (error) {
      next(error);
    }
  }
}
