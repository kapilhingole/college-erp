import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import * as XLSX from 'xlsx';
import { z } from 'zod';
import { prisma } from '../../config';
import { AppError } from '../../middleware/errorHandler';

const studentAdmissionSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6).default('Student@123'),
  phone: z.string().min(8),
  dateOfBirth: z.string(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  bloodGroup: z.string().optional(),
  address: z.string().optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  departmentId: z.string().uuid(),
  programId: z.string().uuid(),
  batchId: z.string().uuid(),
  sectionId: z.string().uuid().optional(),
  currentSemester: z.number().int().min(1).default(1),
  rollNumber: z.string().optional(),
  enrollmentNumber: z.string().optional(),
});

export class StudentsController {
  static async listStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        departmentId,
        programId,
        batchId,
        sectionId,
        semester,
        search,
        status = 'ACTIVE',
      } = req.query;

      const where: any = {};

      // Department scoping for FACULTY role
      if (req.user?.role === 'FACULTY' && req.user.departmentId) {
        where.departmentId = req.user.departmentId;
      } else if (departmentId) {
        where.departmentId = String(departmentId);
      }

      if (programId) where.programId = String(programId);
      if (batchId) where.batchId = String(batchId);
      if (sectionId) where.sectionId = String(sectionId);
      if (semester) where.currentSemester = parseInt(String(semester), 10);
      if (status) where.academicStatus = String(status);

      if (search) {
        const query = String(search).trim();
        where.OR = [
          { firstName: { contains: query } },
          { lastName: { contains: query } },
          { rollNumber: { contains: query } },
          { enrollmentNumber: { contains: query } },
          { email: { contains: query } },
        ];
      }

      const students = await prisma.student.findMany({
        where,
        include: {
          department: { select: { id: true, code: true, name: true } },
          program: { select: { id: true, code: true, name: true } },
          batch: { select: { id: true, name: true, academicYear: true } },
          section: { select: { id: true, name: true } },
        },
        orderBy: [{ rollNumber: 'asc' }],
      });

      res.json({ success: true, count: students.length, data: students });
    } catch (error) {
      next(error);
    }
  }

  static async getStudentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      // Scoping: STUDENT can only view their own profile
      if (req.user?.role === 'STUDENT' && req.user.studentId !== id) {
        throw new AppError('Forbidden: You can only view your own student profile.', 403);
      }

      const student = await prisma.student.findUnique({
        where: { id },
        include: {
          department: true,
          program: true,
          batch: true,
          section: true,
          attendanceRecords: {
            include: {
              lectureSession: {
                include: { subject: true },
              },
            },
            take: 20,
            orderBy: { createdAt: 'desc' },
          },
          feeLedgers: {
            include: { feeStructure: true, payments: true },
            orderBy: { createdAt: 'desc' },
          },
          marksEntries: {
            include: {
              examSchedule: {
                include: { exam: true, subject: true },
              },
            },
          },
          semesterResults: true,
          bookIssues: {
            include: { book: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!student) throw new AppError('Student profile not found.', 404);

      res.json({ success: true, data: student });
    } catch (error) {
      next(error);
    }
  }

  static async admitStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = studentAdmissionSchema.parse(req.body);

      // Verify email uniqueness
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase().trim() },
      });
      if (existingUser) {
        throw new AppError('User with this email already exists.', 409);
      }

      // Generate roll number and enrollment number if not provided
      const year = new Date().getFullYear();
      const count = await prisma.student.count();
      const rollNumber = data.rollNumber || `ROLL-${year}-${String(count + 1).padStart(4, '0')}`;
      const enrollmentNumber =
        data.enrollmentNumber || `ENR-${year}-${String(count + 1).padStart(5, '0')}`;

      const passwordHash = await bcrypt.hash(data.password, 10);

      // ACID Transaction: Create User + Student Profile
      const student = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: data.email.toLowerCase().trim(),
            passwordHash,
            role: 'STUDENT',
            status: 'ACTIVE',
          },
        });

        return tx.student.create({
          data: {
            userId: user.id,
            rollNumber,
            enrollmentNumber,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email.toLowerCase().trim(),
            phone: data.phone,
            dateOfBirth: new Date(data.dateOfBirth),
            gender: data.gender,
            bloodGroup: data.bloodGroup,
            address: data.address,
            guardianName: data.guardianName,
            guardianPhone: data.guardianPhone,
            departmentId: data.departmentId,
            programId: data.programId,
            batchId: data.batchId,
            sectionId: data.sectionId,
            currentSemester: data.currentSemester,
          },
          include: {
            department: true,
            program: true,
            batch: true,
            section: true,
          },
        });
      });

      res.status(201).json({
        success: true,
        message: 'Student admitted and credentials provisioned.',
        data: student,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = studentAdmissionSchema.partial().parse(req.body);

      const updateData: any = { ...data };
      delete updateData.password; // Don't update password through this route
      if (data.dateOfBirth) updateData.dateOfBirth = new Date(data.dateOfBirth);

      const updated = await prisma.student.update({
        where: { id },
        data: updateData,
        include: { department: true, program: true, batch: true, section: true },
      });

      res.json({ success: true, message: 'Student updated successfully.', data: updated });
    } catch (error) {
      next(error);
    }
  }

  static async promoteStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { studentIds, targetSemester } = z
        .object({
          studentIds: z.array(z.string().uuid()),
          targetSemester: z.number().int().min(1).max(12),
        })
        .parse(req.body);

      const result = await prisma.student.updateMany({
        where: { id: { in: studentIds } },
        data: { currentSemester: targetSemester },
      });

      res.json({
        success: true,
        message: `Successfully promoted ${result.count} students to semester ${targetSemester}.`,
      });
    } catch (error) {
      next(error);
    }
  }

  static async allocateSection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { studentIds, sectionId } = z
        .object({
          studentIds: z.array(z.string().uuid()),
          sectionId: z.string().uuid(),
        })
        .parse(req.body);

      const result = await prisma.student.updateMany({
        where: { id: { in: studentIds } },
        data: { sectionId },
      });

      res.json({
        success: true,
        message: `Allocated ${result.count} students to section.`,
      });
    } catch (error) {
      next(error);
    }
  }

  static async downloadTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sampleData = [
        {
          PRN: '1032230001',
          RollNumber: 'ZCOER-CSE-001',
          FirstName: 'Rahul',
          LastName: 'Patil',
          Email: 'rahul.patil@student.zeal.edu.in',
          Phone: '9822011111',
          Gender: 'MALE',
          DateOfBirth: '2004-05-15',
          DepartmentCode: 'CSE',
          Semester: 3,
          SectionName: 'Division A',
          GuardianName: 'Mr. Ramesh Patil',
          GuardianPhone: '9822099999',
          Address: 'Zeal Education Society, Induri Campus, Pune - 410507',
          BloodGroup: 'B+',
          Password: 'Student@123',
        },
        {
          PRN: '1032230002',
          RollNumber: 'ZCOER-IT-002',
          FirstName: 'Pooja',
          LastName: 'Sharma',
          Email: 'pooja.sharma@student.zeal.edu.in',
          Phone: '9822022222',
          Gender: 'FEMALE',
          DateOfBirth: '2004-08-20',
          DepartmentCode: 'IT',
          Semester: 3,
          SectionName: 'Division A',
          GuardianName: 'Mr. Anil Sharma',
          GuardianPhone: '9822088888',
          Address: 'Zeal Education Society, Induri Campus, Pune - 410507',
          BloodGroup: 'O+',
          Password: 'Student@123',
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Students_Template');

      worksheet['!cols'] = [
        { wch: 15 },
        { wch: 18 },
        { wch: 15 },
        { wch: 15 },
        { wch: 34 },
        { wch: 15 },
        { wch: 10 },
        { wch: 14 },
        { wch: 16 },
        { wch: 10 },
        { wch: 14 },
        { wch: 20 },
        { wch: 15 },
        { wch: 45 },
        { wch: 12 },
        { wch: 15 },
      ];

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="zeal_students_import_template.xlsx"'
      );
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  static async bulkImportStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { fileBase64, students: rawStudentsList } = req.body;
      let rows: any[] = [];

      if (fileBase64) {
        const cleanBase64 = fileBase64.includes(';base64,')
          ? fileBase64.split(';base64,')[1]
          : fileBase64;
        const fileBuffer = Buffer.from(cleanBase64, 'base64');
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      } else if (Array.isArray(rawStudentsList)) {
        rows = rawStudentsList;
      } else {
        throw new AppError('Please provide a fileBase64 string or an array of students.', 400);
      }

      if (!rows || rows.length === 0) {
        throw new AppError('The provided file or dataset contains no student rows.', 400);
      }

      const departments = await prisma.department.findMany({
        include: {
          programs: {
            include: {
              batches: {
                include: { sections: true },
              },
              feeStructures: true,
            },
          },
        },
      });

      const deptMap = new Map<string, any>();
      departments.forEach((d) => deptMap.set(d.code.toUpperCase().trim(), d));

      const imported: any[] = [];
      const skipped: { row: number; prn?: string; email?: string; reason: string }[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;

        const prn = String(row.PRN || row.EnrollmentNumber || row.enrollmentNumber || row.prn || '').trim();
        const rollNumber = String(row.RollNumber || row.rollNumber || row.RollNo || prn).trim();
        const firstName = String(row.FirstName || row.firstName || row.Firstname || '').trim();
        const lastName = String(row.LastName || row.lastName || row.Lastname || '').trim();
        const email = String(row.Email || row.email || '').toLowerCase().trim();
        const phone = String(row.Phone || row.phone || row.Mobile || '9800000000').trim();
        const genderRaw = String(row.Gender || row.gender || 'MALE').toUpperCase().trim();
        const gender = ['MALE', 'FEMALE', 'OTHER'].includes(genderRaw) ? genderRaw : 'MALE';
        const dobRaw = row.DateOfBirth || row.dateOfBirth || row.DOB || '2004-01-01';
        const dob = new Date(dobRaw);
        const deptCode = String(row.DepartmentCode || row.departmentCode || row.Department || 'CSE').toUpperCase().trim();
        const semester = parseInt(String(row.Semester || row.semester || 1), 10) || 1;
        const sectionName = String(row.SectionName || row.sectionName || row.Section || 'Division A').trim();
        const guardianName = row.GuardianName || row.guardianName ? String(row.GuardianName || row.guardianName).trim() : null;
        const guardianPhone = row.GuardianPhone || row.guardianPhone ? String(row.GuardianPhone || row.guardianPhone).trim() : null;
        const address = row.Address || row.address ? String(row.Address || row.address).trim() : 'Zeal Education Society, Induri Campus, Pune';
        const bloodGroup = row.BloodGroup || row.bloodGroup ? String(row.BloodGroup || row.bloodGroup).trim() : null;
        const initialPassword = String(row.Password || row.password || 'Student@123').trim();

        if (!prn) {
          skipped.push({ row: rowNum, reason: 'Missing PRN / Enrollment Number' });
          continue;
        }
        if (!firstName || !lastName) {
          skipped.push({ row: rowNum, prn, reason: 'Missing Student Name' });
          continue;
        }
        if (!email || !email.includes('@')) {
          skipped.push({ row: rowNum, prn, reason: 'Invalid or missing Email address' });
          continue;
        }

        const dept = deptMap.get(deptCode) || departments[0];
        if (!dept) {
          skipped.push({ row: rowNum, prn, email, reason: `Department code ${deptCode} not found` });
          continue;
        }

        const program = dept.programs?.[0];
        if (!program) {
          skipped.push({ row: rowNum, prn, email, reason: `No program found for department ${deptCode}` });
          continue;
        }

        const batch = program.batches?.[0];
        if (!batch) {
          skipped.push({ row: rowNum, prn, email, reason: `No batch found for department ${deptCode}` });
          continue;
        }

        const section = batch.sections?.find((s: any) => s.name.toLowerCase() === sectionName.toLowerCase()) || batch.sections?.[0];

        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              { email },
              { studentProfile: { enrollmentNumber: prn } },
              { studentProfile: { rollNumber } },
            ],
          },
        });

        if (existingUser) {
          skipped.push({ row: rowNum, prn, email, reason: 'Student with this PRN, Roll Number, or Email already exists' });
          continue;
        }

        const passwordHash = await bcrypt.hash(initialPassword, 10);

        const newStudent = await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              email,
              passwordHash,
              role: 'STUDENT',
              status: 'ACTIVE',
            },
          });

          const student = await tx.student.create({
            data: {
              userId: user.id,
              rollNumber,
              enrollmentNumber: prn,
              firstName,
              lastName,
              email,
              phone,
              dateOfBirth: isNaN(dob.getTime()) ? new Date('2004-01-01') : dob,
              gender,
              bloodGroup,
              address,
              guardianName,
              guardianPhone,
              departmentId: dept.id,
              programId: program.id,
              batchId: batch.id,
              sectionId: section?.id || null,
              currentSemester: semester,
            },
          });

          const feeStructure = program.feeStructures?.[0];
          if (feeStructure) {
            const invoiceNumber = `INV-${new Date().getFullYear()}-${student.enrollmentNumber}`;
            await tx.studentFeeLedger.create({
              data: {
                studentId: student.id,
                feeStructureId: feeStructure.id,
                invoiceNumber,
                baseAmount: feeStructure.totalAmount,
                discountAmount: 0,
                penaltyAmount: 0,
                totalDue: feeStructure.totalAmount,
                amountPaid: 0,
                balanceDue: feeStructure.totalAmount,
                paymentStatus: 'PENDING',
                dueDate: feeStructure.dueDate || new Date('2024-09-30'),
              },
            });
          }

          return student;
        });

        imported.push({
          id: newStudent.id,
          prn: newStudent.enrollmentNumber,
          rollNumber: newStudent.rollNumber,
          name: `${newStudent.firstName} ${newStudent.lastName}`,
          email: newStudent.email,
          department: dept.code,
        });
      }

      res.status(201).json({
        success: true,
        message: `Bulk import completed: ${imported.length} students imported, ${skipped.length} skipped.`,
        totalProcessed: rows.length,
        importedCount: imported.length,
        skippedCount: skipped.length,
        imported,
        skipped,
      });
    } catch (error) {
      next(error);
    }
  }
}
