import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config';
import { AppError } from '../../middleware/errorHandler';

const departmentSchema = z.object({
  code: z.string().min(2).max(10).toUpperCase(),
  name: z.string().min(3),
  description: z.string().optional(),
});

const programSchema = z.object({
  departmentId: z.string().uuid(),
  code: z.string().min(2).max(15).toUpperCase(),
  name: z.string().min(3),
  totalSemesters: z.number().int().min(1).max(12).default(8),
  degreeType: z.enum(['UG', 'PG', 'DIPLOMA']).default('UG'),
});

const batchSchema = z.object({
  programId: z.string().uuid(),
  name: z.string().min(3),
  academicYear: z.string().min(4),
  startYear: z.number().int(),
  endYear: z.number().int(),
  currentSemester: z.number().int().min(1).max(12).default(1),
});

const sectionSchema = z.object({
  batchId: z.string().uuid(),
  name: z.string().min(1),
  capacity: z.number().int().min(1).default(60),
  roomNumber: z.string().optional(),
});

export class DepartmentsController {
  // --- Departments ---
  static async listDepartments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const departments = await prisma.department.findMany({
        include: {
          programs: {
            include: {
              batches: {
                include: {
                  sections: true,
                },
              },
            },
          },
          _count: {
            select: {
              students: true,
              faculty: true,
              subjects: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      res.json({ success: true, data: departments });
    } catch (error) {
      next(error);
    }
  }

  static async createDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = departmentSchema.parse(req.body);
      const dept = await prisma.department.create({ data });
      res.status(201).json({ success: true, message: 'Department created.', data: dept });
    } catch (error) {
      next(error);
    }
  }

  static async updateDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = departmentSchema.partial().parse(req.body);
      const updated = await prisma.department.update({ where: { id }, data });
      res.json({ success: true, message: 'Department updated.', data: updated });
    } catch (error) {
      next(error);
    }
  }

  static async deleteDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await prisma.department.delete({ where: { id } });
      res.json({ success: true, message: 'Department deleted successfully.' });
    } catch (error) {
      next(error);
    }
  }

  // --- Programs ---
  static async createProgram(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = programSchema.parse(req.body);
      const program = await prisma.program.create({ data });
      res.status(201).json({ success: true, message: 'Program created.', data: program });
    } catch (error) {
      next(error);
    }
  }

  // --- Batches ---
  static async createBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = batchSchema.parse(req.body);
      const batch = await prisma.batch.create({ data });
      res.status(201).json({ success: true, message: 'Batch created.', data: batch });
    } catch (error) {
      next(error);
    }
  }

  // --- Sections ---
  static async createSection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = sectionSchema.parse(req.body);
      const section = await prisma.section.create({ data });
      res.status(201).json({ success: true, message: 'Section created.', data: section });
    } catch (error) {
      next(error);
    }
  }
}
