import { Request, Response, NextFunction } from 'express';
import { prisma, CONFIG } from '../../config';
import { AppError } from '../../middleware/errorHandler';
import { AttendanceAlertService } from '../../services/attendanceAlertService';
import { FeeService } from '../../services/feeService';

export class DashboardsController {
  // Personalized Student Dashboard
  static async getStudentDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user?.studentId;
      if (!studentId) throw new AppError('Student profile required.', 400);

      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          department: true,
          program: true,
          batch: true,
          section: true,
          attendanceRecords: {
            include: { lectureSession: { include: { subject: true } } },
          },
          feeLedgers: {
            include: { feeStructure: true },
          },
          bookIssues: {
            where: { status: { in: ['ISSUED', 'OVERDUE'] } },
            include: { book: true },
          },
          semesterResults: {
            orderBy: { semester: 'desc' },
            take: 1,
          },
        },
      });

      if (!student) throw new AppError('Student not found.', 404);

      // Attendance Evaluation
      const attendanceEval = AttendanceAlertService.evaluateStudentAttendance(
        student.id,
        student.attendanceRecords as any,
        CONFIG.ATTENDANCE_MIN_THRESHOLD
      );

      // Fee Summary
      let totalFeesDue = 0;
      let totalFeesPaid = 0;
      for (const ledger of student.feeLedgers) {
        const calc = FeeService.calculateLedger({
          baseAmount: ledger.baseAmount,
          discountAmount: ledger.discountAmount,
          dueDate: ledger.dueDate,
          lateFeePerDay: ledger.feeStructure.lateFeePerDay,
          amountPaid: ledger.amountPaid,
        });
        totalFeesDue += calc.balanceDue;
        totalFeesPaid += calc.amountPaid;
      }

      // Today's Timetable Classes
      const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      const todayDay = days[new Date().getDay()];
      const todayClasses = student.sectionId
        ? await prisma.timetableSlot.findMany({
            where: { sectionId: student.sectionId, dayOfWeek: todayDay },
            include: {
              subject: true,
              faculty: { select: { firstName: true, lastName: true } },
            },
            orderBy: { startTime: 'asc' },
          })
        : [];

      // Targeted Notices
      const notices = await prisma.notice.findMany({
        where: {
          isPublished: true,
          targetRole: { in: ['ALL', 'STUDENT'] },
          OR: [{ targetDepartmentId: null }, { targetDepartmentId: student.departmentId }],
        },
        take: 5,
        orderBy: [{ priority: 'desc' }, { publishedAt: 'desc' }],
      });

      res.json({
        success: true,
        data: {
          profile: {
            id: student.id,
            rollNumber: student.rollNumber,
            name: `${student.firstName} ${student.lastName}`,
            email: student.email,
            department: student.department.name,
            program: student.program.name,
            currentSemester: student.currentSemester,
            section: student.section?.name,
          },
          attendance: {
            overallPercentage: attendanceEval.overallPercentage,
            totalLectures: attendanceEval.totalLectures,
            totalAttended: attendanceEval.totalAttended,
            isDefaulter: attendanceEval.isOverallDefaulter,
            alertMessage: attendanceEval.alertMessage,
            subjects: attendanceEval.subjectSummaries,
          },
          fees: {
            totalFeesDue: Number(totalFeesDue.toFixed(2)),
            totalFeesPaid: Number(totalFeesPaid.toFixed(2)),
            hasOutstanding: totalFeesDue > 0,
          },
          academics: {
            latestResult: student.semesterResults[0] || null,
          },
          library: {
            activeBorrowedCount: student.bookIssues.length,
            borrowedBooks: student.bookIssues,
          },
          todaySchedule: todayClasses,
          recentNotices: notices,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Personalized Faculty Dashboard
  static async getFacultyDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const facultyId = req.user?.facultyId;
      if (!facultyId) throw new AppError('Faculty profile required.', 400);

      const faculty = await prisma.faculty.findUnique({
        where: { id: facultyId },
        include: {
          department: true,
          subjectAssignments: {
            include: { subject: true, batch: true, section: true },
          },
          timetableSlots: {
            include: { subject: true, section: true },
          },
        },
      });

      if (!faculty) throw new AppError('Faculty member not found.', 404);

      const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      const todayDay = days[new Date().getDay()];

      const todaySchedule = await prisma.timetableSlot.findMany({
        where: { facultyId, dayOfWeek: todayDay },
        include: {
          subject: true,
          section: { include: { batch: { include: { program: true } } } },
        },
        orderBy: { startTime: 'asc' },
      });

      const notices = await prisma.notice.findMany({
        where: {
          isPublished: true,
          targetRole: { in: ['ALL', 'FACULTY'] },
          OR: [{ targetDepartmentId: null }, { targetDepartmentId: faculty.departmentId }],
        },
        take: 5,
        orderBy: [{ priority: 'desc' }, { publishedAt: 'desc' }],
      });

      res.json({
        success: true,
        data: {
          profile: {
            id: faculty.id,
            employeeId: faculty.employeeId,
            name: `${faculty.firstName} ${faculty.lastName}`,
            designation: faculty.designation,
            department: faculty.department.name,
            maxWeeklyHours: faculty.maxWeeklyHours,
            currentWeeklySlots: faculty.timetableSlots.length,
          },
          todaySchedule,
          assignedSubjects: faculty.subjectAssignments,
          recentNotices: notices,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin & Super Admin Executive Dashboard
  static async getAdminDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const [
        totalStudents,
        totalFaculty,
        totalDepartments,
        totalSubjects,
        feeAggregates,
        booksCount,
        borrowedCount,
        recentAudits,
      ] = await Promise.all([
        prisma.student.count({ where: { academicStatus: 'ACTIVE' } }),
        prisma.faculty.count(),
        prisma.department.count(),
        prisma.subject.count(),
        prisma.studentFeeLedger.aggregate({
          _sum: {
            totalDue: true,
            amountPaid: true,
            balanceDue: true,
          },
        }),
        prisma.book.count(),
        prisma.bookIssueRecord.count({ where: { status: { in: ['ISSUED', 'OVERDUE'] } } }),
        prisma.auditLog.findMany({
          take: 8,
          orderBy: { timestamp: 'desc' },
          include: { user: { select: { email: true, role: true } } },
        }),
      ]);

      // Calculate attendance average across all students
      const allStudents = await prisma.student.findMany({
        where: { academicStatus: 'ACTIVE' },
        include: { attendanceRecords: { include: { lectureSession: { include: { subject: true } } } } },
      });

      let totalPctSum = 0;
      let defaulterCount = 0;
      let evaluatedCount = 0;

      for (const s of allStudents) {
        if (s.attendanceRecords.length > 0) {
          const evalRes = AttendanceAlertService.evaluateStudentAttendance(
            s.id,
            s.attendanceRecords as any,
            CONFIG.ATTENDANCE_MIN_THRESHOLD
          );
          totalPctSum += evalRes.overallPercentage;
          if (evalRes.isOverallDefaulter) defaulterCount++;
          evaluatedCount++;
        }
      }

      const collegeAverageAttendance =
        evaluatedCount > 0 ? Number((totalPctSum / evaluatedCount).toFixed(1)) : 100.0;

      res.json({
        success: true,
        data: {
          counts: {
            students: totalStudents,
            faculty: totalFaculty,
            departments: totalDepartments,
            subjects: totalSubjects,
          },
          fees: {
            totalBilled: feeAggregates._sum.totalDue || 0,
            totalCollected: feeAggregates._sum.amountPaid || 0,
            totalOutstanding: feeAggregates._sum.balanceDue || 0,
            collectionRatePercentage:
              feeAggregates._sum.totalDue && feeAggregates._sum.totalDue > 0
                ? Number(
                    (((feeAggregates._sum.amountPaid || 0) / feeAggregates._sum.totalDue) * 100).toFixed(
                      1
                    )
                  )
                : 0,
          },
          attendance: {
            averagePercentage: collegeAverageAttendance,
            defaulterCount,
            evaluatedStudentsCount: evaluatedCount,
          },
          library: {
            totalBookTitles: booksCount,
            currentlyBorrowed: borrowedCount,
          },
          recentAudits,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
