import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config';
import { AppError } from '../../middleware/errorHandler';
import { GradingService } from '../../services/gradingService';

const subjectSchema = z.object({
  code: z.string().min(2).max(15).toUpperCase(),
  name: z.string().min(3),
  departmentId: z.string().uuid(),
  semester: z.number().int().min(1).max(12),
  credits: z.number().int().min(1).max(10).default(4),
  type: z.enum(['THEORY', 'PRACTICAL', 'ELECTIVE']).default('THEORY'),
  maxInternalMarks: z.number().default(30.0),
  maxExternalMarks: z.number().default(70.0),
  totalMarks: z.number().default(100.0),
  syllabusOverview: z.string().optional(),
});

const examSchema = z.object({
  name: z.string().min(3),
  examType: z.enum(['MID_TERM', 'FINAL', 'INTERNAL', 'PRACTICAL']),
  semester: z.number().int().min(1).max(12),
  academicYear: z.string().min(4),
  startDate: z.string(),
  endDate: z.string(),
});

const examScheduleSchema = z.object({
  examId: z.string().uuid(),
  subjectId: z.string().uuid(),
  examDate: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  roomNumber: z.string(),
  maxMarks: z.number().default(100.0),
});

const bulkMarksSchema = z.object({
  examScheduleId: z.string().uuid(),
  entries: z.array(
    z.object({
      studentId: z.string().uuid(),
      internalMarks: z.number().min(0),
      theoryMarks: z.number().min(0),
      practicalMarks: z.number().min(0).optional(),
      remarks: z.string().optional(),
    })
  ),
});

export class AcademicsController {
  // --- Subjects ---
  static async listSubjects(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { departmentId, semester } = req.query;
      const where: any = {};
      if (departmentId) where.departmentId = String(departmentId);
      if (semester) where.semester = parseInt(String(semester), 10);

      const subjects = await prisma.subject.findMany({
        where,
        include: { department: { select: { id: true, code: true, name: true } } },
        orderBy: [{ semester: 'asc' }, { code: 'asc' }],
      });

      res.json({ success: true, count: subjects.length, data: subjects });
    } catch (error) {
      next(error);
    }
  }

  static async createSubject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = subjectSchema.parse(req.body);
      const subject = await prisma.subject.create({
        data: {
          ...data,
          totalMarks: data.maxInternalMarks + data.maxExternalMarks,
        },
      });
      res.status(201).json({ success: true, message: 'Subject created.', data: subject });
    } catch (error) {
      next(error);
    }
  }

  // --- Exams & Schedules ---
  static async listExams(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const exams = await prisma.exam.findMany({
        include: {
          schedules: {
            include: {
              subject: true,
              _count: { select: { marks: true } },
            },
          },
        },
        orderBy: { startDate: 'desc' },
      });

      res.json({ success: true, data: exams });
    } catch (error) {
      next(error);
    }
  }

  static async createExam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = examSchema.parse(req.body);
      const exam = await prisma.exam.create({
        data: {
          ...data,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
        },
      });
      res.status(201).json({ success: true, message: 'Exam cycle created.', data: exam });
    } catch (error) {
      next(error);
    }
  }

  static async createExamSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = examScheduleSchema.parse(req.body);
      const schedule = await prisma.examSchedule.create({
        data: {
          ...data,
          examDate: new Date(data.examDate),
        },
        include: { subject: true, exam: true },
      });
      res.status(201).json({ success: true, message: 'Exam scheduled.', data: schedule });
    } catch (error) {
      next(error);
    }
  }

  // --- Marks Entry & Automated Grading Engine ---
  static async submitMarks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { examScheduleId, entries } = bulkMarksSchema.parse(req.body);

      const schedule = await prisma.examSchedule.findUnique({
        where: { id: examScheduleId },
        include: { subject: true },
      });

      if (!schedule) throw new AppError('Exam schedule not found.', 404);

      // Calculate grade points and letter grade using GradingService for each entry
      const processed = entries.map((entry) => {
        const gradeResult = GradingService.calculateSubjectMarks({
          internalMarks: entry.internalMarks,
          theoryMarks: entry.theoryMarks,
          practicalMarks: entry.practicalMarks || 0,
          maxInternalMarks: schedule.subject.maxInternalMarks,
          maxExternalMarks: schedule.subject.maxExternalMarks,
          credits: schedule.subject.credits,
        });

        return {
          examScheduleId,
          studentId: entry.studentId,
          internalMarks: entry.internalMarks,
          theoryMarks: entry.theoryMarks,
          practicalMarks: entry.practicalMarks || 0,
          totalMarks: gradeResult.totalMarks,
          percentage: gradeResult.percentage,
          letterGrade: gradeResult.letterGrade,
          gradePoint: gradeResult.gradePoint,
          status: gradeResult.status,
          remarks: entry.remarks,
        };
      });

      // Save marks using transaction (upsert for each student)
      await prisma.$transaction(
        processed.map((entry) =>
          prisma.marksEntry.upsert({
            where: {
              examScheduleId_studentId: {
                examScheduleId: entry.examScheduleId,
                studentId: entry.studentId,
              },
            },
            create: entry,
            update: entry,
          })
        )
      );

      res.json({
        success: true,
        message: `Successfully graded and saved marks for ${processed.length} students.`,
      });
    } catch (error) {
      next(error);
    }
  }

  // --- Publish Semester Results & Calculate SGPA / CGPA ---
  static async publishSemesterResults(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { semester, departmentId } = z
        .object({
          semester: z.number().int().min(1).max(12),
          departmentId: z.string().uuid().optional(),
        })
        .parse(req.body);

      // Find all students in that semester
      const studentWhere: any = { currentSemester: semester };
      if (departmentId) studentWhere.departmentId = departmentId;

      const students = await prisma.student.findMany({
        where: studentWhere,
        include: {
          marksEntries: {
            where: { examSchedule: { subject: { semester } } },
            include: { examSchedule: { include: { subject: true } } },
          },
          semesterResults: true,
        },
      });

      const publishedResults = [];

      for (const student of students) {
        if (student.marksEntries.length === 0) continue;

        const subjectScores = student.marksEntries.map((m) => ({
          subjectCode: m.examSchedule.subject.code,
          credits: m.examSchedule.subject.credits,
          gradePoint: m.gradePoint,
          status: m.status as 'PASS' | 'FAIL',
        }));

        const sgpaResult = GradingService.calculateSGPA(subjectScores);

        // Calculate CGPA across all previous semesters + current
        const previousSems = student.semesterResults
          .filter((r) => r.semester < semester)
          .map((r) => ({ sgpa: r.sgpa, totalCredits: r.totalCredits }));

        const allSems = [...previousSems, { sgpa: sgpaResult.sgpa, totalCredits: sgpaResult.totalCredits }];
        const cgpa = GradingService.calculateCGPA(allSems);

        const resultRecord = await prisma.studentSemesterResult.upsert({
          where: {
            studentId_semester: {
              studentId: student.id,
              semester,
            },
          },
          create: {
            studentId: student.id,
            semester,
            totalCredits: sgpaResult.totalCredits,
            earnedCredits: sgpaResult.earnedCredits,
            sgpa: sgpaResult.sgpa,
            cgpa,
            resultStatus: sgpaResult.resultStatus,
          },
          update: {
            totalCredits: sgpaResult.totalCredits,
            earnedCredits: sgpaResult.earnedCredits,
            sgpa: sgpaResult.sgpa,
            cgpa,
            resultStatus: sgpaResult.resultStatus,
            publishedAt: new Date(),
          },
        });

        publishedResults.push(resultRecord);
      }

      res.json({
        success: true,
        message: `Results published and SGPA/CGPA computed for ${publishedResults.length} students.`,
        data: publishedResults,
      });
    } catch (error) {
      next(error);
    }
  }

  // --- Student Report Card ---
  static async getStudentReportCard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { studentId, semester } = req.params;

      // Scoping: STUDENT can only view their own report card
      if (req.user?.role === 'STUDENT' && req.user.studentId !== studentId) {
        throw new AppError('Forbidden: Access denied to other student report cards.', 403);
      }

      const semNum = parseInt(semester, 10);

      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          department: true,
          program: true,
          batch: true,
          section: true,
          marksEntries: {
            where: { examSchedule: { subject: { semester: semNum } } },
            include: {
              examSchedule: {
                include: { subject: true, exam: true },
              },
            },
          },
          semesterResults: {
            where: { semester: semNum },
          },
        },
      });

      if (!student) throw new AppError('Student not found.', 404);

      res.json({
        success: true,
        data: {
          student: {
            id: student.id,
            rollNumber: student.rollNumber,
            enrollmentNumber: student.enrollmentNumber,
            name: `${student.firstName} ${student.lastName}`,
            department: student.department.name,
            program: student.program.name,
            batch: student.batch.name,
            section: student.section?.name,
            semester: semNum,
          },
          marks: student.marksEntries,
          summary: student.semesterResults[0] || null,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
