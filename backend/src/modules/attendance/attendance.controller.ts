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
  // Create a lecture session (Faculty or Admin)
  static async createSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = lectureSessionSchema.parse(req.body);
      const facultyId = req.user?.role === 'FACULTY' ? req.user.facultyId : req.body.facultyId;

      if (!facultyId) {
        throw new AppError('Faculty ID is required for a lecture session.', 400);
      }

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
        include: {
          subject: true,
          section: true,
        },
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

  // Bulk record attendance for students in a lecture session
  static async markBulkAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { lectureSessionId, records } = bulkAttendanceSchema.parse(req.body);

      const session = await prisma.lectureSession.findUnique({
        where: { id: lectureSessionId },
      });
      if (!session) throw new AppError('Lecture session not found.', 404);

      // Perform upsert inside transaction
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

  // Get attendance evaluation & <75% alert for a specific student
  static async getStudentAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { studentId } = req.params;

      if (req.user?.role === 'STUDENT' && req.user.studentId !== studentId) {
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

      res.json({
        success: true,
        data: evaluation,
      });
    } catch (error) {
      next(error);
    }
  }

  // Personal read-only attendance portal endpoint for logged-in students
  static async getMyAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Find student profile from user token
      let studentId = req.user?.studentId;

      if (!studentId && req.user?.id) {
        const studentProfile = await prisma.student.findUnique({
          where: { userId: req.user.id },
        });
        studentId = studentProfile?.id;
      }

      if (!studentId) {
        throw new AppError('No student record tied to this user account.', 404);
      }

      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          department: true,
          program: true,
          batch: true,
          section: true,
        },
      });

      if (!student) throw new AppError('Student profile not found.', 404);

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

  // Get defaulter list (<75%) for a section or department
  static async getDefaulters(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sectionId, departmentId, threshold } = req.query;
      const minThreshold = threshold ? parseFloat(String(threshold)) : CONFIG.ATTENDANCE_MIN_THRESHOLD;

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
            include: {
              lectureSession: { include: { subject: true } },
            },
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

      res.json({
        success: true,
        count: defaulters.length,
        minThreshold,
        data: defaulters,
      });
    } catch (error) {
      next(error);
    }
  }

  // Student leave application
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

      res.status(201).json({
        success: true,
        message: 'Leave application submitted.',
        data: leave,
      });
    } catch (error) {
      next(error);
    }
  }

  // Approve / reject leave application (Faculty or Admin)
  static async reviewLeave(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status, comments } = z
        .object({
          status: z.enum(['APPROVED', 'REJECTED']),
          comments: z.string().optional(),
        })
        .parse(req.body);

      const updated = await prisma.leaveApplication.update({
        where: { id },
        data: {
          status,
          comments,
          approvedBy: req.user?.id,
        },
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
