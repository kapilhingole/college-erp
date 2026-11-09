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
});

export class TimetableController {
  static async listSlots(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sectionId, facultyId, dayOfWeek, semester } = req.query;
      const where: any = {};

      if (sectionId) where.sectionId = String(sectionId);
      if (facultyId) where.facultyId = String(facultyId);
      if (dayOfWeek) where.dayOfWeek = String(dayOfWeek).toUpperCase();
      if (semester) where.semester = parseInt(String(semester), 10);

      // Scoping: If user is FACULTY and didn't specify facultyId, default to their own schedule
      if (req.user?.role === 'FACULTY' && !facultyId && !sectionId) {
        where.facultyId = req.user.facultyId;
      }

      // Scoping: If user is STUDENT and didn't specify sectionId, default to their section
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

  static async createSlot(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = timetableSlotSchema.parse(req.body);

      // 1. Fetch all existing slots on the same day for collision detection
      const existingSlots = await prisma.timetableSlot.findMany({
        where: { dayOfWeek: data.dayOfWeek },
      });

      // 2. Run conflict detection engine
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

      // 3. Create timetable slot
      const newSlot = await prisma.timetableSlot.create({
        data,
        include: {
          subject: true,
          faculty: true,
          section: true,
        },
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

  static async deleteSlot(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await prisma.timetableSlot.delete({ where: { id } });
      res.json({ success: true, message: 'Timetable slot deleted.' });
    } catch (error) {
      next(error);
    }
  }
}
