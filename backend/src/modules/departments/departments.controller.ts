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

  // --- Department Dashboard (Students & Attendance, Syllabus Coverage, Load Completion) ---
  static async getDepartmentDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code } = req.params;
      const rawCode = String(code || '').trim().toUpperCase();
      const resolvedCode =
        rawCode === 'CE' ? 'COMP' :
        rawCode === 'E&TC' || rawCode === 'ETC' ? 'ENTC' :
        rawCode;

      const dept = await prisma.department.findFirst({
        where: {
          OR: [
            { code: resolvedCode },
            { code: rawCode },
            { id: String(code) },
          ],
        },
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
        },
      });

      if (!dept) {
        throw new AppError(`Department '${code}' not found.`, 404);
      }

      // 1. STUDENTS AND ATTENDANCE
      const rawStudents = await prisma.student.findMany({
        where: { departmentId: dept.id },
        include: {
          section: { select: { id: true, name: true } },
          batch: { select: { id: true, name: true, academicYear: true } },
          attendanceRecords: {
            select: {
              id: true,
              status: true,
              createdAt: true,
              lectureSession: {
                select: {
                  id: true,
                  sessionDate: true,
                  sessionTime: true,
                  topicCovered: true,
                  subject: { select: { id: true, code: true, name: true } },
                },
              },
            },
          },
        },
        orderBy: [{ rollNumber: 'asc' }],
      });

      const totalLectureSessions = await prisma.lectureSession.count({
        where: {
          section: {
            batch: {
              program: {
                departmentId: dept.id,
              },
            },
          },
        },
      });

      const studentsData = rawStudents.map((st) => {
        const totalSessions = st.attendanceRecords.length;
        const attendedSessions = st.attendanceRecords.filter(
          (r) => r.status === 'PRESENT' || r.status === 'LATE'
        ).length;
        const absentSessions = st.attendanceRecords.filter((r) => r.status === 'ABSENT').length;
        const lateSessions = st.attendanceRecords.filter((r) => r.status === 'LATE').length;

        const attendancePercentage =
          totalSessions > 0
            ? Number(((attendedSessions / totalSessions) * 100).toFixed(1))
            : 100.0;

        const isDefaulter = attendancePercentage < 75.0;

        return {
          id: st.id,
          rollNumber: st.rollNumber,
          firstName: st.firstName,
          lastName: st.lastName,
          email: st.email,
          enrollmentNumber: st.enrollmentNumber,
          academicStatus: st.academicStatus,
          division: st.section?.name || 'Division A',
          batchName: st.batch?.name || 'Batch 2024-2028',
          totalSessions,
          attendedSessions,
          absentSessions,
          lateSessions,
          attendancePercentage,
          isDefaulter,
        };
      });

      const totalStudentsCount = studentsData.length;
      const defaultersCount = studentsData.filter((s) => s.isDefaulter).length;
      const averageAttendance =
        totalStudentsCount > 0
          ? Number(
              (
                studentsData.reduce((acc, s) => acc + s.attendancePercentage, 0) /
                totalStudentsCount
              ).toFixed(1)
            )
          : 100.0;

      const attendanceBands = {
        high: studentsData.filter((s) => s.attendancePercentage >= 85).length,
        moderate: studentsData.filter(
          (s) => s.attendancePercentage >= 75 && s.attendancePercentage < 85
        ).length,
        defaulter: defaultersCount,
      };

      // 2. SYLLABUS COVERAGE BY PROFESSOR
      const rawFaculty = await prisma.faculty.findMany({
        where: { departmentId: dept.id },
        include: {
          syllabusTopics: {
            orderBy: { orderIndex: 'asc' },
          },
          syllabusExtraLoads: true,
          subjectAssignments: {
            include: {
              subject: { select: { id: true, code: true, name: true, credits: true, type: true } },
            },
          },
        },
        orderBy: [{ firstName: 'asc' }],
      });

      const professorsSyllabus = rawFaculty.map((fac) => {
        const totalTopics = fac.syllabusTopics.length;
        const completedTopics = fac.syllabusTopics.filter((t) => t.status === 'DONE').length;
        const pendingTopics = totalTopics - completedTopics;

        const coveragePercentage =
          totalTopics > 0
            ? Number(((completedTopics / totalTopics) * 100).toFixed(1))
            : 0.0;

        const assignedCourses = Array.from(
          new Set(fac.subjectAssignments.map((a) => `${a.subject.code} - ${a.subject.name}`))
        );

        return {
          facultyId: fac.id,
          employeeId: fac.employeeId,
          name: `Prof. ${fac.firstName} ${fac.lastName}`,
          designation: fac.designation,
          email: fac.email,
          assignedCourses: assignedCourses.length > 0 ? assignedCourses : ['General Core Engineering'],
          totalTopics,
          completedTopics,
          pendingTopics,
          coveragePercentage,
          topics: fac.syllabusTopics.map((t) => ({
            id: t.id,
            title: t.title,
            allottedMinutes: t.allottedMinutes,
            status: t.status,
            completedAt: t.completedAt,
          })),
        };
      });

      const totalTopicsInDept = professorsSyllabus.reduce((acc, p) => acc + p.totalTopics, 0);
      const totalCompletedTopics = professorsSyllabus.reduce((acc, p) => acc + p.completedTopics, 0);
      const averageSyllabusCoverage =
        professorsSyllabus.length > 0
          ? Number(
              (
                professorsSyllabus.reduce((acc, p) => acc + p.coveragePercentage, 0) /
                professorsSyllabus.length
              ).toFixed(1)
            )
          : 0.0;

      // 3. LOAD COMPLETION BY PROFESSOR
      const professorsLoad = rawFaculty.map((fac) => {
        const allottedHours = fac.maxWeeklyHours || 20;
        // Completed load hours: derived from currentLoadHours or completed topic durations
        const topicHoursCompleted = fac.syllabusTopics
          .filter((t) => t.status === 'DONE')
          .reduce((sum, t) => sum + t.allottedMinutes / 60, 0);

        const completedHours = Number((fac.currentLoadHours || topicHoursCompleted || 0).toFixed(1));
        const remainingHours = Number(Math.max(0, allottedHours - completedHours).toFixed(1));
        const extraLoadsCount = fac.syllabusExtraLoads.length;

        const loadCompletionPercentage =
          allottedHours > 0
            ? Number(((completedHours / allottedHours) * 100).toFixed(1))
            : 0.0;

        let status = 'LAGGING';
        if (loadCompletionPercentage >= 100) status = 'COMPLETED';
        else if (loadCompletionPercentage >= 70) status = 'ON_TRACK';
        else if (loadCompletionPercentage >= 40) status = 'IN_PROGRESS';

        const assignedCourses = Array.from(
          new Set(fac.subjectAssignments.map((a) => `${a.subject.code} - ${a.subject.name}`))
        );

        return {
          facultyId: fac.id,
          employeeId: fac.employeeId,
          name: `Prof. ${fac.firstName} ${fac.lastName}`,
          designation: fac.designation,
          email: fac.email,
          assignedCourses: assignedCourses.length > 0 ? assignedCourses : ['General Core Engineering'],
          allottedHours,
          completedHours,
          remainingHours,
          extraLoadsCount,
          loadCompletionPercentage,
          status,
        };
      });

      const totalAllottedHours = professorsLoad.reduce((acc, p) => acc + p.allottedHours, 0);
      const totalCompletedHours = Number(
        professorsLoad.reduce((acc, p) => acc + p.completedHours, 0).toFixed(1)
      );
      const totalRemainingHours = Number(
        professorsLoad.reduce((acc, p) => acc + p.remainingHours, 0).toFixed(1)
      );
      const overallLoadCompletion =
        totalAllottedHours > 0
          ? Number(((totalCompletedHours / totalAllottedHours) * 100).toFixed(1))
          : 0.0;

      res.json({
        success: true,
        data: {
          department: {
            id: dept.id,
            code: rawCode === 'COMP' ? 'CE' : dept.code === 'COMP' ? 'CE' : dept.code,
            rawCode: dept.code,
            name: dept.name,
            description: dept.description,
          },
          studentsAndAttendance: {
            summary: {
              totalStudents: totalStudentsCount,
              averageAttendancePercentage: averageAttendance,
              defaultersCount,
              totalSessionsConducted: totalLectureSessions || 8,
              attendanceBands,
            },
            students: studentsData,
          },
          syllabusCoverage: {
            summary: {
              averageCoveragePercentage: averageSyllabusCoverage,
              totalTopicsCount: totalTopicsInDept,
              completedTopicsCount: totalCompletedTopics,
              pendingTopicsCount: totalTopicsInDept - totalCompletedTopics,
              totalProfessors: professorsSyllabus.length,
            },
            professors: professorsSyllabus,
          },
          loadCompletion: {
            summary: {
              overallLoadCompletionPercentage: overallLoadCompletion,
              totalAllottedHours,
              totalCompletedHours,
              totalRemainingHours,
              totalExtraLoads: professorsLoad.reduce((acc, p) => acc + p.extraLoadsCount, 0),
              totalProfessors: professorsLoad.length,
            },
            professors: professorsLoad,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
