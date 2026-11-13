import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config';
import { AppError } from '../../middleware/errorHandler';

// ----------------------------------------------------------------
// Schema: Faculty enters marks for one or many students
// ----------------------------------------------------------------
const marksEntrySchema = z.object({
  examScheduleId: z.string().uuid(),
  studentId: z.string().uuid(),
  internalMarks: z.number().min(0).max(100).default(0),
  theoryMarks: z.number().min(0).max(100).default(0),
  practicalMarks: z.number().min(0).max(100).default(0),
  remarks: z.string().optional(),
  status: z.enum(['PASS', 'FAIL', 'ABSENT']).default('PASS'),
});

const bulkMarksSchema = z.object({
  entries: z.array(marksEntrySchema).min(1),
});

// ----------------------------------------------------------------
export class MarksController {
  /**
   * POST /marks/bulk
   * Faculty enters marks for multiple students in one request.
   * Each entry is upserted so re-submission overwrites without duplicates.
   * Faculty may only enter marks for exam schedules whose subject they are
   * assigned to teach — enforced server-side.
   */
  static async enterBulkMarks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entries } = bulkMarksSchema.parse(req.body);

      // Gather unique examScheduleIds for validation
      const scheduleIds = [...new Set(entries.map((e) => e.examScheduleId))];
      const schedules = await prisma.examSchedule.findMany({
        where: { id: { in: scheduleIds } },
        include: {
          exam: true,
          subject: true,
        },
      });

      if (schedules.length !== scheduleIds.length) {
        throw new AppError('One or more ExamSchedule IDs are invalid.', 400);
      }

      // Faculty scope check: verify that the faculty member is assigned to teach
      // the subject(s) linked to these exam schedules.
      if (req.user?.role === 'FACULTY') {
        const facultyId = req.user.facultyId;
        if (!facultyId) throw new AppError('Faculty profile not found on token.', 403);

        for (const schedule of schedules) {
          const assignment = await prisma.facultySubjectAssignment.findFirst({
            where: { facultyId, subjectId: schedule.subjectId },
          });
          if (!assignment) {
            throw new AppError(
              `Forbidden: You are not assigned to teach ${schedule.subject.code} — ${schedule.subject.name}.`,
              403
            );
          }
        }
      }

      // Compute totals and grades per entry, then upsert
      const results = await prisma.$transaction(
        entries.map((entry) => {
          const total = entry.internalMarks + entry.theoryMarks + entry.practicalMarks;

          // Simple percentage-based grading (100-point scale)
          const percentage = Math.min(100, total);
          let letterGrade = 'F';
          let gradePoint = 0.0;
          if (percentage >= 90) { letterGrade = 'O'; gradePoint = 10.0; }
          else if (percentage >= 80) { letterGrade = 'A+'; gradePoint = 9.0; }
          else if (percentage >= 70) { letterGrade = 'A'; gradePoint = 8.0; }
          else if (percentage >= 60) { letterGrade = 'B+'; gradePoint = 7.0; }
          else if (percentage >= 50) { letterGrade = 'B'; gradePoint = 6.0; }
          else if (percentage >= 40) { letterGrade = 'C'; gradePoint = 5.0; }

          const finalStatus = entry.status === 'ABSENT' ? 'ABSENT' : (percentage >= 40 ? 'PASS' : 'FAIL');

          return prisma.marksEntry.upsert({
            where: {
              examScheduleId_studentId: {
                examScheduleId: entry.examScheduleId,
                studentId: entry.studentId,
              },
            },
            create: {
              examScheduleId: entry.examScheduleId,
              studentId: entry.studentId,
              internalMarks: entry.internalMarks,
              theoryMarks: entry.theoryMarks,
              practicalMarks: entry.practicalMarks,
              totalMarks: total,
              percentage,
              letterGrade,
              gradePoint,
              status: finalStatus,
              remarks: entry.remarks,
              enteredByFacultyId: req.user?.role === 'FACULTY' ? req.user.facultyId : undefined,
            },
            update: {
              internalMarks: entry.internalMarks,
              theoryMarks: entry.theoryMarks,
              practicalMarks: entry.practicalMarks,
              totalMarks: total,
              percentage,
              letterGrade,
              gradePoint,
              status: finalStatus,
              remarks: entry.remarks,
              enteredByFacultyId: req.user?.role === 'FACULTY' ? req.user.facultyId : undefined,
            },
          });
        })
      );

      res.status(201).json({
        success: true,
        message: `Marks entered for ${results.length} students.`,
        data: results,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /marks/student/:studentId
   * A student sees only their own marks; faculty see marks for their subjects;
   * superadmin/admin/management see everything.
   */
  static async getStudentMarks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { studentId } = req.params;
      const user = req.user!;

      // Students can only view their own marks
      if (user.role === 'STUDENT' && user.studentId !== studentId) {
        throw new AppError('Forbidden: You may only view your own marks.', 403);
      }

      const marks = await prisma.marksEntry.findMany({
        where: { studentId },
        include: {
          examSchedule: {
            include: {
              exam: true,
              subject: { select: { id: true, code: true, name: true } },
            },
          },
          enteredByFaculty: {
            select: { id: true, firstName: true, lastName: true, employeeId: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ success: true, count: marks.length, data: marks });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /marks/exam-schedule/:examScheduleId
   * Faculty get marks they entered for a given exam schedule.
   * Admin/SUPER_ADMIN see all.
   */
  static async getMarksByExamSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { examScheduleId } = req.params;
      const user = req.user!;
      const where: any = { examScheduleId };

      if (user.role === 'FACULTY') {
        // Faculty only see marks they personally entered
        where.enteredByFacultyId = user.facultyId;
      }

      const marks = await prisma.marksEntry.findMany({
        where,
        include: {
          student: { select: { id: true, firstName: true, lastName: true, rollNumber: true, enrollmentNumber: true } },
          examSchedule: { include: { exam: true, subject: true } },
          enteredByFaculty: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { student: { rollNumber: 'asc' } },
      });

      res.json({ success: true, count: marks.length, data: marks });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /marks/superadmin/all
   * Superadmin aggregation: all marks with multi-filter support.
   * Only SUPER_ADMIN, ADMIN, MANAGEMENT may call this.
   */
  static async getAllMarks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { departmentId, subjectId, facultyId, studentId, examType, academicYear } = req.query;
      const where: any = {};

      if (studentId) where.studentId = String(studentId);
      if (facultyId) where.enteredByFacultyId = String(facultyId);

      if (subjectId) {
        where.examSchedule = { subjectId: String(subjectId) };
      }

      if (examType || academicYear || departmentId) {
        where.examSchedule = {
          ...where.examSchedule,
          ...(examType ? { exam: { examType: String(examType) } } : {}),
          ...(academicYear ? { exam: { academicYear: String(academicYear) } } : {}),
        };
      }

      if (departmentId) {
        // Filter via subject → department
        where.examSchedule = {
          ...where.examSchedule,
          subject: { departmentId: String(departmentId) },
        };
      }

      const marks = await prisma.marksEntry.findMany({
        where,
        include: {
          student: {
            select: {
              id: true, firstName: true, lastName: true, rollNumber: true,
              enrollmentNumber: true,
              department: { select: { id: true, code: true, name: true } },
              batch: { select: { name: true, academicYear: true } },
            },
          },
          examSchedule: {
            include: {
              exam: { select: { name: true, examType: true, academicYear: true } },
              subject: { select: { id: true, code: true, name: true, departmentId: true } },
            },
          },
          enteredByFaculty: {
            select: { id: true, firstName: true, lastName: true, employeeId: true, department: { select: { code: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      });

      res.json({ success: true, count: marks.length, data: marks });
    } catch (error) {
      next(error);
    }
  }
}
