import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../config';
import { AppError } from '../../middleware/errorHandler';

const facultyOnboardingSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6).default('Faculty@123'),
  phone: z.string().min(8),
  designation: z.string().min(2),
  qualification: z.string().min(2),
  departmentId: z.string().uuid(),
  maxWeeklyHours: z.number().int().min(1).max(40).default(18),
  employeeId: z.string().optional(),
});

const subjectAssignmentSchema = z.object({
  facultyId: z.string().uuid(),
  subjectId: z.string().uuid(),
  batchId: z.string().uuid(),
  sectionId: z.string().uuid().optional(),
  academicSession: z.string().min(4),
});

export class FacultyController {
  static async listFaculty(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { departmentId, search } = req.query;
      const where: any = {};

      if (departmentId) where.departmentId = String(departmentId);
      if (search) {
        const query = String(search).trim();
        where.OR = [
          { firstName: { contains: query } },
          { lastName: { contains: query } },
          { employeeId: { contains: query } },
          { email: { contains: query } },
          { designation: { contains: query } },
        ];
      }

      const faculty = await prisma.faculty.findMany({
        where,
        include: {
          department: { select: { id: true, code: true, name: true } },
          subjectAssignments: {
            include: {
              subject: true,
              batch: true,
              section: true,
            },
          },
          _count: {
            select: { timetableSlots: true },
          },
        },
        orderBy: { firstName: 'asc' },
      });

      res.json({ success: true, count: faculty.length, data: faculty });
    } catch (error) {
      next(error);
    }
  }

  static async getFacultyById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const member = await prisma.faculty.findUnique({
        where: { id },
        include: {
          department: true,
          subjectAssignments: {
            include: {
              subject: true,
              batch: true,
              section: true,
            },
          },
          timetableSlots: {
            include: {
              subject: true,
              section: {
                include: { batch: { include: { program: true } } },
              },
            },
          },
        },
      });

      if (!member) throw new AppError('Faculty member not found.', 404);

      // Calculate real workload hours based on timetable slots count
      const totalWeeklySlots = member.timetableSlots.length;

      res.json({
        success: true,
        data: {
          ...member,
          currentLoadHours: totalWeeklySlots,
          utilizationPercentage: Number(
            ((totalWeeklySlots / member.maxWeeklyHours) * 100).toFixed(1)
          ),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async onboardFaculty(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = facultyOnboardingSchema.parse(req.body);

      const existingUser = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase().trim() },
      });
      if (existingUser) {
        throw new AppError('User with this email already exists.', 409);
      }

      const year = new Date().getFullYear();
      const count = await prisma.faculty.count();
      const employeeId = data.employeeId || `FAC-${year}-${String(count + 1).padStart(3, '0')}`;
      const passwordHash = await bcrypt.hash(data.password, 10);

      const faculty = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: data.email.toLowerCase().trim(),
            passwordHash,
            role: 'FACULTY',
            status: 'ACTIVE',
          },
        });

        return tx.faculty.create({
          data: {
            userId: user.id,
            employeeId,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email.toLowerCase().trim(),
            phone: data.phone,
            designation: data.designation,
            qualification: data.qualification,
            departmentId: data.departmentId,
            maxWeeklyHours: data.maxWeeklyHours,
          },
          include: {
            department: true,
          },
        });
      });

      res.status(201).json({
        success: true,
        message: 'Faculty member onboarded successfully.',
        data: faculty,
      });
    } catch (error) {
      next(error);
    }
  }

  static async assignSubject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = subjectAssignmentSchema.parse(req.body);

      const assignment = await prisma.facultySubjectAssignment.create({
        data,
        include: {
          faculty: true,
          subject: true,
          batch: true,
          section: true,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Subject assigned to faculty member.',
        data: assignment,
      });
    } catch (error) {
      next(error);
    }
  }
}
