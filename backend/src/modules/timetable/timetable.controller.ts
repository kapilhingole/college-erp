import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config';
import { AppError } from '../../middleware/errorHandler';
import { TimetableConflictService } from '../../services/timetableConflictService';

const timetableSlotSchema = z.object({
  dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  subjectId: z.string().uuid(),
  facultyId: z.string().uuid(),
  sectionId: z.string().uuid(),
  roomNumber: z.string().min(1),
  semester: z.number().int().min(1).max(12),
  academicSession: z.string().min(4),
  // Department/year context from uploaded timetable PDFs (like ZCOER FY/SY timetables)
  divisionLabel: z.string().optional(),   // e.g. "Div A", "Div B"
  yearLabel: z.string().optional(),       // "FY" | "SY"
  slotType: z.string().optional(),        // "LECTURE" | "LAB" | "TUTORIAL"
});

const updateSlotSchema = timetableSlotSchema.partial();

export class TimetableController {
  static async listSlots(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sectionId, facultyId, dayOfWeek, semester, departmentId, yearLabel } = req.query;
      const where: any = {};

      if (sectionId) where.sectionId = String(sectionId);
      if (facultyId) where.facultyId = String(facultyId);
      if (dayOfWeek) where.dayOfWeek = String(dayOfWeek).toUpperCase();
      if (semester) where.semester = parseInt(String(semester), 10);
      if (yearLabel) where.yearLabel = String(yearLabel).toUpperCase();

      // Department scoping: filter via section → batch → program → department
      if (departmentId) {
        where.section = {
          batch: {
            program: { departmentId: String(departmentId) },
          },
        };
      }

      // Scoping: FACULTY defaults to their own schedule
      if (req.user?.role === 'FACULTY' && !facultyId && !sectionId) {
        where.facultyId = req.user.facultyId;
      }

      // Scoping: STUDENT defaults to their section's timetable
      if (req.user?.role === 'STUDENT' && !sectionId) {
        const student = await prisma.student.findUnique({
          where: { id: req.user.studentId },
          select: { sectionId: true },
        });
        if (student?.sectionId) {
          where.sectionId = student.sectionId;
        }
      }

      const slots = await prisma.timetableSlot.findMany({
        where,
        include: {
          subject: true,
          faculty: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
          section: {
            include: {
              batch: { include: { program: { include: { department: true } } } },
            },
          },
        },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });

      res.json({ success: true, count: slots.length, data: slots });
    } catch (error) {
      next(error);
    }
  }

  static async getSlotById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const slot = await prisma.timetableSlot.findUnique({
        where: { id },
        include: {
          subject: true,
          faculty: { select: { id: true, firstName: true, lastName: true, designation: true, employeeId: true } },
          section: {
            include: {
              batch: { include: { program: { include: { department: true } } } },
            },
          },
          lectureSessions: {
            orderBy: { sessionDate: 'desc' },
            take: 10,
            include: { _count: { select: { attendanceRecords: true } } },
          },
        },
      });
      if (!slot) throw new AppError('Timetable slot not found.', 404);
      res.json({ success: true, data: slot });
    } catch (error) {
      next(error);
    }
  }

  static async createSlot(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = timetableSlotSchema.parse(req.body);

      // Fetch existing slots on the same day for collision detection
      const existingSlots = await prisma.timetableSlot.findMany({
        where: { dayOfWeek: data.dayOfWeek },
      });

      const conflict = TimetableConflictService.detectConflict(
        {
          dayOfWeek: data.dayOfWeek,
          startTime: data.startTime,
          endTime: data.endTime,
          facultyId: data.facultyId,
          roomNumber: data.roomNumber,
          sectionId: data.sectionId,
          subjectId: data.subjectId,
        },
        existingSlots.map((s) => ({
          id: s.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          facultyId: s.facultyId,
          roomNumber: s.roomNumber,
          sectionId: s.sectionId,
          subjectId: s.subjectId,
        }))
      );

      if (conflict.hasConflict) {
        res.status(409).json({
          success: false,
          conflictType: conflict.type,
          message: conflict.message,
          conflictingSlot: conflict.conflictingSlot,
        });
        return;
      }

      const newSlot = await prisma.timetableSlot.create({
        data: {
          dayOfWeek: data.dayOfWeek,
          startTime: data.startTime,
          endTime: data.endTime,
          subjectId: data.subjectId,
          facultyId: data.facultyId,
          sectionId: data.sectionId,
          roomNumber: data.roomNumber,
          semester: data.semester,
          academicSession: data.academicSession,
          divisionLabel: data.divisionLabel,
          yearLabel: data.yearLabel,
          slotType: data.slotType ?? 'LECTURE',
        },
        include: { subject: true, faculty: true, section: true },
      });

      res.status(201).json({
        success: true,
        message: 'Timetable slot created successfully with zero collisions.',
        data: newSlot,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateSlot(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = updateSlotSchema.parse(req.body);

      const existing = await prisma.timetableSlot.findUnique({ where: { id } });
      if (!existing) throw new AppError('Timetable slot not found.', 404);

      // If timing or resource fields changed, re-run conflict detection
      const needsConflictCheck =
        data.dayOfWeek || data.startTime || data.endTime ||
        data.facultyId || data.roomNumber || data.sectionId;

      if (needsConflictCheck) {
        const merged = { ...existing, ...data };
        const slotsOnDay = await prisma.timetableSlot.findMany({
          where: { dayOfWeek: merged.dayOfWeek, NOT: { id } },
        });

        const conflict = TimetableConflictService.detectConflict(
          {
            dayOfWeek: merged.dayOfWeek,
            startTime: merged.startTime,
            endTime: merged.endTime,
            facultyId: merged.facultyId,
            roomNumber: merged.roomNumber,
            sectionId: merged.sectionId,
            subjectId: merged.subjectId,
          },
          slotsOnDay.map((s) => ({
            id: s.id,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            facultyId: s.facultyId,
            roomNumber: s.roomNumber,
            sectionId: s.sectionId,
            subjectId: s.subjectId,
          }))
        );

        if (conflict.hasConflict) {
          res.status(409).json({
            success: false,
            conflictType: conflict.type,
            message: conflict.message,
          });
          return;
        }
      }

      const updated = await prisma.timetableSlot.update({
        where: { id },
        data,
        include: { subject: true, faculty: true, section: true },
      });

      res.json({ success: true, message: 'Timetable slot updated.', data: updated });
    } catch (error) {
      next(error);
    }
  }

  static async deleteSlot(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await prisma.timetableSlot.delete({ where: { id } });
      res.json({ success: true, message: 'Timetable slot deleted.' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /timetable/department/:departmentId
   * Returns timetable grouped by year label (FY / SY) and day for a department.
   * Accessible to admin roles, plus faculty/students scoped to their own department.
   */
  static async getDepartmentTimetable(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { departmentId } = req.params;
      const { yearLabel, academicSession } = req.query;

      // Students and faculty may only see their own department
      const user = req.user!;
      if (user.role === 'STUDENT' || user.role === 'FACULTY') {
        if (user.departmentId !== departmentId) {
          throw new AppError('Forbidden: You can only view timetables for your own department.', 403);
        }
      }

      const where: any = {
        section: { batch: { program: { departmentId } } },
      };
      if (yearLabel) where.yearLabel = String(yearLabel).toUpperCase();
      if (academicSession) where.academicSession = String(academicSession);

      const slots = await prisma.timetableSlot.findMany({
        where,
        include: {
          subject: { select: { id: true, code: true, name: true, type: true } },
          faculty: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
          section: {
            include: {
              batch: { include: { program: { include: { department: true } } } },
            },
          },
        },
        orderBy: [{ yearLabel: 'asc' }, { dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });

      // Group by yearLabel → dayOfWeek → slots[]
      const grouped: Record<string, Record<string, typeof slots>> = {};
      for (const slot of slots) {
        const yr = slot.yearLabel ?? 'UNSPECIFIED';
        const day = slot.dayOfWeek;
        if (!grouped[yr]) grouped[yr] = {};
        if (!grouped[yr][day]) grouped[yr][day] = [];
        grouped[yr][day].push(slot);
      }

      res.json({ success: true, departmentId, data: grouped, totalSlots: slots.length });
    } catch (error) {
      next(error);
    }
  }
}
