import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma, CONFIG } from '../../config';
import { AppError } from '../../middleware/errorHandler';
import { AttendanceAlertService } from '../../services/attendanceAlertService';

const lectureSessionSchema = z.object({
  timetableSlotId: z.string().uuid().optional(),
  subjectId: z.string().uuid(),
  sectionId: z.string().uuid(),
  sessionDate: z.string(),
  sessionTime: z.string(),
  topicCovered: z.string().optional(),
});

const bulkAttendanceSchema = z.object({
  lectureSessionId: z.string().uuid(),
  records: z.array(
    z.object({
      studentId: z.string().uuid(),
      status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
      remarks: z.string().optional(),
    })
  ),
});

const leaveApplicationSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().min(5),
});

export class AttendanceController {
  // ----------------------------------------------------------------
  // Create a lecture session (Faculty or Admin)
  // Faculty may only create sessions for timetable slots assigned to them.
  // ----------------------------------------------------------------
  static async createSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = lectureSessionSchema.parse(req.body);
      const user = req.user!;

      let facultyId: string | undefined;

      if (user.role === 'FACULTY') {
        facultyId = user.facultyId;
        if (!facultyId) throw new AppError('Faculty profile not linked to this account.', 403);

        // If a timetable slot is specified, verify it is assigned to this faculty
        if (data.timetableSlotId) {
          const slot = await prisma.timetableSlot.findUnique({
            where: { id: data.timetableSlotId },
          });
          if (!slot) throw new AppError('Timetable slot not found.', 404);
          if (slot.facultyId !== facultyId) {
            throw new AppError('Forbidden: This timetable slot is not assigned to you.', 403);
          }
        }
      } else {
        // Admin / Management may supply explicit facultyId or fall back to body
        facultyId = req.body.facultyId;
      }

      if (!facultyId) throw new AppError('Faculty ID is required for a lecture session.', 400);

      const session = await prisma.lectureSession.create({
        data: {
          timetableSlotId: data.timetableSlotId,
          subjectId: data.subjectId,
          facultyId,
          sectionId: data.sectionId,
          sessionDate: new Date(data.sessionDate),
          sessionTime: data.sessionTime,
          topicCovered: data.topicCovered,
        },
        include: { subject: true, section: true },
      });

      res.status(201).json({
        success: true,
        message: 'Lecture session initiated.',
        data: session,
      });
    } catch (error) {
      next(error);
    }
  }

  // ----------------------------------------------------------------
  // Bulk record attendance — faculty must own the session
  // Duplicate entries are prevented by the unique constraint on
  // (lectureSessionId, studentId) via upsert.
  // ----------------------------------------------------------------
  static async markBulkAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { lectureSessionId, records } = bulkAttendanceSchema.parse(req.body);
      const user = req.user!;

      const session = await prisma.lectureSession.findUnique({
        where: { id: lectureSessionId },
      });
      if (!session) throw new AppError('Lecture session not found.', 404);

      // Faculty may only mark attendance for sessions they own
      if (user.role === 'FACULTY' && session.facultyId !== user.facultyId) {
        throw new AppError('Forbidden: You can only mark attendance for your own lecture sessions.', 403);
      }

      // Upsert inside transaction — prevents duplicate entries
      await prisma.$transaction(
        records.map((r) =>
          prisma.attendanceRecord.upsert({
            where: {
              lectureSessionId_studentId: {
                lectureSessionId,
                studentId: r.studentId,
              },
            },
            create: {
              lectureSessionId,
              studentId: r.studentId,
              status: r.status,
              remarks: r.remarks,
            },
            update: {
              status: r.status,
              remarks: r.remarks,
            },
          })
        )
      );

      res.json({
        success: true,
        message: `Marked attendance for ${records.length} students successfully.`,
      });
    } catch (error) {
      next(error);
    }
  }

  // ----------------------------------------------------------------
  // Get attendance for a specific student (server-enforced scoping)
  // ----------------------------------------------------------------
  static async getStudentAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { studentId } = req.params;
      const user = req.user!;

      if (user.role === 'STUDENT' && user.studentId !== studentId) {
        throw new AppError('Forbidden: Access denied to other student attendance.', 403);
      }

      const records = await prisma.attendanceRecord.findMany({
        where: { studentId },
        include: {
          lectureSession: {
            include: {
              subject: true,
              faculty: { select: { firstName: true, lastName: true, designation: true } },
            },
          },
        },
        orderBy: { lectureSession: { sessionDate: 'desc' } },
      });

      const evaluation = AttendanceAlertService.evaluateStudentAttendance(
        studentId,
        records as any,
        CONFIG.ATTENDANCE_MIN_THRESHOLD
      );

      res.json({ success: true, data: evaluation });
    } catch (error) {
      next(error);
    }
  }

  // ----------------------------------------------------------------
  // Personal attendance portal for logged-in student.
  // Attendance is computed ONLY against subjects from the student's
  // section's timetable — lectures from other departments/years
  // do not count against them.
  // ----------------------------------------------------------------
  static async getMyAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let studentId = req.user?.studentId;

      if (!studentId && req.user?.id) {
        const sp = await prisma.student.findUnique({ where: { userId: req.user.id } });
        studentId = sp?.id;
      }
      if (!studentId) throw new AppError('No student record tied to this user account.', 404);

      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: { department: true, program: true, batch: true, section: true },
      });
      if (!student) throw new AppError('Student profile not found.', 404);

      // Pull subject IDs from the student's section's timetable so only
      // scheduled subjects count in the attendance denominator.
      const timetableSubjectIds = student.sectionId
        ? (
            await prisma.timetableSlot.findMany({
              where: { sectionId: student.sectionId },
              select: { subjectId: true },
              distinct: ['subjectId'],
            })
          ).map((s) => s.subjectId)
        : undefined;

      const records = await prisma.attendanceRecord.findMany({
        where: {
          studentId,
          ...(timetableSubjectIds && timetableSubjectIds.length > 0
            ? { lectureSession: { subjectId: { in: timetableSubjectIds } } }
            : {}),
        },
        include: {
          lectureSession: {
            include: {
              subject: true,
              faculty: { select: { firstName: true, lastName: true, designation: true } },
            },
          },
        },
        orderBy: { lectureSession: { sessionDate: 'desc' } },
      });

      const evaluation = AttendanceAlertService.evaluateStudentAttendance(
        studentId,
        records as any,
        CONFIG.ATTENDANCE_MIN_THRESHOLD
      );

      const dailyLogs = records.map((r) => ({
        id: r.id,
        date: r.lectureSession.sessionDate,
        time: r.lectureSession.sessionTime,
        subjectCode: r.lectureSession.subject.code,
        subjectName: r.lectureSession.subject.name,
        facultyName: r.lectureSession.faculty
          ? `Prof. ${r.lectureSession.faculty.firstName} ${r.lectureSession.faculty.lastName}`
          : 'Course Faculty',
        topicCovered: r.lectureSession.topicCovered || 'Curriculum Lecture Session',
        status: r.status,
        remarks: r.remarks,
        readOnly: true,
      }));

      res.json({
        success: true,
        data: {
          student: {
            id: student.id,
            name: `${student.firstName} ${student.lastName}`,
            rollNumber: student.rollNumber,
            enrollmentNumber: student.enrollmentNumber,
            department: student.department?.name,
            departmentCode: student.department?.code,
            program: student.program?.name,
            semester: student.currentSemester,
            section: student.section?.name || 'Division A',
            academicStatus: student.academicStatus,
          },
          evaluation,
          dailyLogs,
          canEdit: false,
          securityNotice:
            'Official university attendance records marked by course professors. Students have read-only access.',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ----------------------------------------------------------------
  // Faculty profile view: sessions and attendance marked by this faculty
  // ----------------------------------------------------------------
  static async getFacultyAttendanceSummary(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { facultyId } = req.params;
      const user = req.user!;

      // Faculty can only view their own summary
      if (user.role === 'FACULTY' && user.facultyId !== facultyId) {
        throw new AppError('Forbidden: You may only view your own attendance records.', 403);
      }

      const sessions = await prisma.lectureSession.findMany({
        where: { facultyId },
        include: {
          subject: { select: { id: true, code: true, name: true } },
          section: { select: { id: true, name: true } },
          timetableSlot: {
            select: {
              dayOfWeek: true, startTime: true, endTime: true,
              yearLabel: true, divisionLabel: true,
            },
          },
          _count: { select: { attendanceRecords: true } },
        },
        orderBy: { sessionDate: 'desc' },
        take: 100,
      });

      // Aggregate: sessions per subject
      const subjectMap = new Map<
        string,
        { subjectCode: string; subjectName: string; sessions: number; markedRecords: number }
      >();
      for (const s of sessions) {
        const key = s.subjectId;
        const existing = subjectMap.get(key) ?? {
          subjectCode: s.subject.code,
          subjectName: s.subject.name,
          sessions: 0,
          markedRecords: 0,
        };
        existing.sessions += 1;
        existing.markedRecords += s._count.attendanceRecords;
        subjectMap.set(key, existing);
      }

      res.json({
        success: true,
        data: {
          facultyId,
          totalSessions: sessions.length,
          totalMarkedRecords: sessions.reduce((acc, s) => acc + s._count.attendanceRecords, 0),
          subjectSummary: Array.from(subjectMap.values()),
          recentSessions: sessions.slice(0, 20),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ----------------------------------------------------------------
  // Superadmin: all attendance records with rich filtering
  // ----------------------------------------------------------------
  static async getAllAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { departmentId, studentId, facultyId, subjectId, yearLabel, fromDate, toDate } =
        req.query;

      const where: any = {};
      if (studentId) where.studentId = String(studentId);

      const sessionWhere: any = {};
      if (facultyId) sessionWhere.facultyId = String(facultyId);
      if (subjectId) sessionWhere.subjectId = String(subjectId);
      if (fromDate || toDate) {
        sessionWhere.sessionDate = {};
        if (fromDate) sessionWhere.sessionDate.gte = new Date(String(fromDate));
        if (toDate) sessionWhere.sessionDate.lte = new Date(String(toDate));
      }
      if (yearLabel) {
        sessionWhere.timetableSlot = { yearLabel: String(yearLabel).toUpperCase() };
      }

      if (Object.keys(sessionWhere).length > 0) {
        where.lectureSession = sessionWhere;
      }

      if (departmentId) {
        where.student = { departmentId: String(departmentId) };
      }

      const records = await prisma.attendanceRecord.findMany({
        where,
        include: {
          student: {
            select: {
              id: true, firstName: true, lastName: true, rollNumber: true, enrollmentNumber: true,
              department: { select: { id: true, code: true, name: true } },
            },
          },
          lectureSession: {
            include: {
              subject: { select: { id: true, code: true, name: true } },
              faculty: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
              timetableSlot: {
                select: { dayOfWeek: true, yearLabel: true, divisionLabel: true },
              },
            },
          },
        },
        orderBy: { lectureSession: { sessionDate: 'desc' } },
        take: 1000,
      });

      res.json({ success: true, count: records.length, data: records });
    } catch (error) {
      next(error);
    }
  }

  // ----------------------------------------------------------------
  // Defaulter list (< threshold %)
  // ----------------------------------------------------------------
  static async getDefaulters(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sectionId, departmentId, threshold } = req.query;
      const minThreshold = threshold
        ? parseFloat(String(threshold))
        : CONFIG.ATTENDANCE_MIN_THRESHOLD;

      const where: any = { academicStatus: 'ACTIVE' };
      if (sectionId) where.sectionId = String(sectionId);
      if (departmentId) where.departmentId = String(departmentId);

      const students = await prisma.student.findMany({
        where,
        include: {
          department: true,
          program: true,
          section: true,
          attendanceRecords: {
            include: { lectureSession: { include: { subject: true } } },
          },
        },
      });

      const defaulters = [];
      for (const student of students) {
        const evaluation = AttendanceAlertService.evaluateStudentAttendance(
          student.id,
          student.attendanceRecords as any,
          minThreshold
        );
        if (evaluation.isOverallDefaulter) {
          defaulters.push({
            studentId: student.id,
            rollNumber: student.rollNumber,
            name: `${student.firstName} ${student.lastName}`,
            department: student.department.name,
            program: student.program.name,
            section: student.section?.name || 'Unassigned',
            totalLectures: evaluation.totalLectures,
            totalAttended: evaluation.totalAttended,
            overallPercentage: evaluation.overallPercentage,
            shortfallPercentage: Number((minThreshold - evaluation.overallPercentage).toFixed(2)),
            subjectSummaries: evaluation.subjectSummaries.filter((s) => s.isDefaulter),
          });
        }
      }

      res.json({ success: true, count: defaulters.length, minThreshold, data: defaulters });
    } catch (error) {
      next(error);
    }
  }

  // ----------------------------------------------------------------
  // Student leave application
  // ----------------------------------------------------------------
  static async applyLeave(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user?.role !== 'STUDENT' || !req.user.studentId) {
        throw new AppError('Only students can apply for leave.', 403);
      }
      const data = leaveApplicationSchema.parse(req.body);
      const leave = await prisma.leaveApplication.create({
        data: {
          studentId: req.user.studentId,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          reason: data.reason,
          status: 'PENDING',
        },
      });
      res.status(201).json({ success: true, message: 'Leave application submitted.', data: leave });
    } catch (error) {
      next(error);
    }
  }

  // ----------------------------------------------------------------
  // Approve / reject leave (Faculty or Admin)
  // ----------------------------------------------------------------
  static async reviewLeave(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status, comments } = z
        .object({ status: z.enum(['APPROVED', 'REJECTED']), comments: z.string().optional() })
        .parse(req.body);

      const updated = await prisma.leaveApplication.update({
        where: { id },
        data: { status, comments, approvedBy: req.user?.id },
      });
      res.json({
        success: true,
        message: `Leave application ${status.toLowerCase()}.`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
}
