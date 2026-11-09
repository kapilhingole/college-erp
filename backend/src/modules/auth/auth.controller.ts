import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma, CONFIG } from '../../config';
import { AppError } from '../../middleware/errorHandler';

// Modern bcrypt dummy hash for constant-time comparison to prevent email enumeration timing attacks
const DUMMY_HASH = '$2a$12$6qg66p4h8iZcZ2X99c8jOe3jS7Yk2w4yP0A9Z6V2y8gU3mO4zK2q.';

// 1. Flexible Login Schema: accepts Email, PRN (Enrollment Number), Roll Number, or Employee ID
const loginSchema = z.object({
  email: z.string().optional(),
  usernameOrEmail: z.string().optional(),
  username: z.string().optional(),
  userId: z.string().optional(),
  password: z.string().min(1, 'Password is required'),
});

// 2. Provisioning Schema (Management issues accounts for Faculty, Management, Student)
const provisionUserSchema = z.object({
  email: z.string().email('Valid institutional email is required'),
  password: z.string().min(8, 'Initial password must be at least 8 characters long'),
  role: z.enum(['Faculty', 'Management', 'Student', 'FACULTY', 'MANAGEMENT', 'STUDENT']),
  profile: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    phone: z.string().optional(),

    // Student specific fields
    rollNumber: z.string().optional(),
    enrollmentNumber: z.string().optional(),
    departmentId: z.string().optional(),
    departmentCode: z.string().optional(),
    programId: z.string().optional(),
    batchId: z.string().optional(),
    sectionId: z.string().optional(),
    currentSemester: z.number().int().optional().default(1),
    dateOfBirth: z.string().optional(),
    gender: z.string().optional().default('OTHER'),
    bloodGroup: z.string().optional(),
    address: z.string().optional(),
    guardianName: z.string().optional(),
    guardianPhone: z.string().optional(),

    // Faculty specific fields
    employeeId: z.string().optional(),
    designation: z.string().optional(),
    qualification: z.string().optional(),
    maxWeeklyHours: z.number().int().optional(),

    // Management specific fields
    office: z.string().optional(),
  }),
});

export class AuthController {
  /**
   * REQUIREMENT 2: Login flow authenticating by Email, PRN, Roll Number, or Employee ID.
   * REQUIREMENT 5: Handles unprovisioned users, wrong passwords (uniform error without revealing identifier existence),
   * and disabled accounts.
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = loginSchema.parse(req.body);
      const rawIdentifier = (
        parsed.email ||
        parsed.usernameOrEmail ||
        parsed.username ||
        parsed.userId ||
        ''
      ).trim();
      const password = parsed.password;

      if (!rawIdentifier) {
        throw new AppError('Email address, PRN, or User ID is required.', 400);
      }

      const identifierLower = rawIdentifier.toLowerCase();

      // Multi-Identifier Resolution:
      // 1. Direct User account email
      // 2. Student PRN (enrollmentNumber) or Roll Number
      // 3. Faculty Employee ID
      // 4. Management Employee ID
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: { equals: identifierLower } },
            {
              studentProfile: {
                OR: [
                  { enrollmentNumber: { equals: rawIdentifier } },
                  { rollNumber: { equals: rawIdentifier } },
                  { email: { equals: identifierLower } },
                ],
              },
            },
            {
              facultyProfile: {
                OR: [
                  { employeeId: { equals: rawIdentifier } },
                  { email: { equals: identifierLower } },
                ],
              },
            },
            {
              managementProfile: {
                OR: [
                  { employeeId: { equals: rawIdentifier } },
                  { email: { equals: identifierLower } },
                ],
              },
            },
          ],
        },
        include: {
          studentProfile: {
            include: {
              department: true,
              program: true,
              batch: true,
              section: true,
            },
          },
          facultyProfile: {
            include: {
              department: true,
            },
          },
          managementProfile: true,
        },
      });

      // Convenience fallback for short usernames (e.g. 'superadmin' -> 'superadmin@zeal.edu.in')
      if (!user && !rawIdentifier.includes('@')) {
        user = await prisma.user.findFirst({
          where: {
            email: { startsWith: `${identifierLower}@` },
          },
          include: {
            studentProfile: {
              include: {
                department: true,
                program: true,
                batch: true,
                section: true,
              },
            },
            facultyProfile: {
              include: {
                department: true,
              },
            },
            managementProfile: true,
          },
        });
      }

      // 1. User has not yet been provisioned:
      // Perform constant-time dummy bcrypt comparison to eliminate timing-based user enumeration.
      if (!user) {
        await bcrypt.compare(password, DUMMY_HASH);
        throw new AppError('Invalid email or password.', 401);
      }

      // 2. User account is disabled or suspended:
      if (user.status !== 'ACTIVE') {
        throw new AppError('Account is disabled. Please contact the management team.', 403);
      }

      // 3. Verify password hash using bcrypt
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        // Uniform error response matches unprovisioned email to prevent account enumeration
        throw new AppError('Invalid email or password.', 401);
      }

      // 4. Issue JWT carrying user's ID, email, and Management-assigned role
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        CONFIG.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Structure role-appropriate profile data (never exposing passwordHash)
      let profileData: any = null;
      if (user.role === 'STUDENT') {
        profileData = user.studentProfile;
      } else if (user.role === 'FACULTY') {
        profileData = user.facultyProfile;
      } else {
        profileData = user.managementProfile || {
          employeeId: 'MGMT-ZCOER-001',
          firstName: 'Management',
          lastName: 'Officer',
          email: user.email,
          designation: 'Institutional Administrator',
          office: 'Central Administration',
        };
      }

      res.json({
        success: true,
        message: 'Login successful.',
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            status: user.status,
          },
          profile: profileData,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * REQUIREMENT 1 & 3: Provisioning path where Management creates accounts and tied profiles.
   * Passwords are encrypted with bcrypt (12 salt rounds) and never stored/returned plaintext.
   */
  static async provisionUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, role, profile } = provisionUserSchema.parse(req.body);
      const emailNormalized = email.toLowerCase().trim();

      // Normalize role name into canonical uppercase
      let canonicalRole: 'FACULTY' | 'MANAGEMENT' | 'STUDENT';
      const roleUpper = role.toUpperCase();
      if (roleUpper === 'FACULTY') canonicalRole = 'FACULTY';
      else if (roleUpper === 'MANAGEMENT' || roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN') canonicalRole = 'MANAGEMENT';
      else canonicalRole = 'STUDENT';

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: emailNormalized },
      });

      if (existingUser) {
        throw new AppError('A user with this email address has already been provisioned.', 409);
      }

      // Hash initial password with bcrypt (12 rounds)
      const passwordHash = await bcrypt.hash(password, 12);

      // Resolve department if student/faculty
      let departmentId = profile.departmentId;
      if (!departmentId && profile.departmentCode) {
        const dept = await prisma.department.findUnique({
          where: { code: profile.departmentCode.toUpperCase() },
        });
        if (dept) departmentId = dept.id;
      }
      if (!departmentId && canonicalRole !== 'MANAGEMENT') {
        const firstDept = await prisma.department.findFirst();
        if (firstDept) departmentId = firstDept.id;
      }

      // Resolve Program and Batch for student
      let programId = profile.programId;
      let batchId = profile.batchId;
      if (canonicalRole === 'STUDENT') {
        if (!programId) {
          const prog = await prisma.program.findFirst({
            where: departmentId ? { departmentId } : undefined,
          });
          if (prog) programId = prog.id;
        }
        if (!batchId && programId) {
          const batch = await prisma.batch.findFirst({
            where: { programId },
          });
          if (batch) batchId = batch.id;
        }
      }

      // Atomically provision User and Profile in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // 1. Create User account
        const newUser = await tx.user.create({
          data: {
            email: emailNormalized,
            passwordHash,
            role: canonicalRole,
            status: 'ACTIVE',
          },
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
            createdAt: true,
          },
        });

        // 2. Create Tied Role Profile immediately
        let createdProfile: any = null;

        if (canonicalRole === 'STUDENT') {
          const rollNumber =
            profile.rollNumber || `ZCOER-${profile.departmentCode || 'ENG'}-${Math.floor(1000 + Math.random() * 9000)}`;
          const enrollmentNumber =
            profile.enrollmentNumber || `10322${Math.floor(10000 + Math.random() * 90000)}`;

          createdProfile = await tx.student.create({
            data: {
              userId: newUser.id,
              firstName: profile.firstName,
              lastName: profile.lastName,
              email: emailNormalized,
              rollNumber,
              enrollmentNumber,
              phone: profile.phone || '9876543210',
              gender: profile.gender || 'OTHER',
              dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth) : new Date('2004-01-01'),
              currentSemester: profile.currentSemester || 1,
              departmentId: departmentId!,
              programId: programId!,
              batchId: batchId!,
              sectionId: profile.sectionId || null,
              bloodGroup: profile.bloodGroup || 'O+',
              address: profile.address || 'Pune, Maharashtra',
              guardianName: profile.guardianName || 'Guardian',
              guardianPhone: profile.guardianPhone || '9876500000',
            },
            include: {
              department: true,
              program: true,
              batch: true,
              section: true,
            },
          });
        } else if (canonicalRole === 'FACULTY') {
          const employeeId =
            profile.employeeId || `FAC-ZCOER-${Math.floor(100 + Math.random() * 900)}`;

          createdProfile = await tx.faculty.create({
            data: {
              userId: newUser.id,
              firstName: profile.firstName,
              lastName: profile.lastName,
              email: emailNormalized,
              employeeId,
              phone: profile.phone || '9876543210',
              designation: profile.designation || 'Assistant Professor',
              qualification: profile.qualification || 'M.Tech / Ph.D in Engineering',
              departmentId: departmentId!,
              maxWeeklyHours: profile.maxWeeklyHours || 18,
            },
            include: {
              department: true,
            },
          });
        } else {
          // MANAGEMENT
          const employeeId =
            profile.employeeId || `MGMT-ZCOER-${Math.floor(100 + Math.random() * 900)}`;

          createdProfile = await tx.managementProfile.create({
            data: {
              userId: newUser.id,
              firstName: profile.firstName,
              lastName: profile.lastName,
              email: emailNormalized,
              employeeId,
              phone: profile.phone || '9876543210',
              designation: profile.designation || 'Dean of Administration',
              office: profile.office || 'Central Administration',
            },
          });
        }

        return { user: newUser, profile: createdProfile };
      });

      res.status(201).json({
        success: true,
        message: `${canonicalRole} account and profile provisioned successfully.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * REQUIREMENT 3 & 4: Profile retrieval endpoint with Role-Based Access Control.
   * Returns current user's profile based strictly on their server-verified token and role.
   */
  static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required to access profile.', 401);
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          studentProfile: {
            include: {
              department: { select: { id: true, code: true, name: true } },
              program: { select: { id: true, code: true, name: true, degreeType: true } },
              batch: { select: { id: true, name: true, academicYear: true, currentSemester: true } },
              section: { select: { id: true, name: true, roomNumber: true } },
            },
          },
          facultyProfile: {
            include: {
              department: { select: { id: true, code: true, name: true } },
            },
          },
          managementProfile: true,
        },
      });

      if (!user) {
        throw new AppError('User account not found.', 404);
      }

      if (user.status !== 'ACTIVE') {
        throw new AppError('Account is disabled. Please contact the management team.', 403);
      }

      let profileData: any = null;
      if (user.role === 'STUDENT') {
        profileData = user.studentProfile;
      } else if (user.role === 'FACULTY') {
        profileData = user.facultyProfile;
      } else {
        profileData = user.managementProfile || {
          employeeId: 'MGMT-ZCOER-001',
          firstName: 'Management',
          lastName: 'Officer',
          email: user.email,
          designation: 'Institutional Administrator',
          office: 'Central Administration',
        };
      }

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
          createdAt: user.createdAt,
          profile: profileData,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Alias for backward compatibility with frontend auth check
   */
  static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    return AuthController.getProfile(req, res, next);
  }

  /**
   * Password change endpoint (for provisioned users)
   */
  static async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized.', 401);
      const { currentPassword, newPassword } = req.body;

      if (!newPassword || newPassword.length < 8) {
        throw new AppError('New password must be at least 8 characters long.', 400);
      }

      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (!user) throw new AppError('User not found.', 404);

      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) throw new AppError('Incorrect current password.', 400);

      const passwordHash = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      res.json({
        success: true,
        message: 'Password changed successfully.',
      });
    } catch (error) {
      next(error);
    }
  }
}
