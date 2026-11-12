import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma, CONFIG } from '../../config';
import { AppError } from '../../middleware/errorHandler';

// Constant-time dummy hash — prevents timing-based user enumeration on login
const DUMMY_HASH = '$2a$12$6qg66p4h8iZcZ2X99c8jOe3jS7Yk2w4yP0A9Z6V2y8gU3mO4zK2q.';

// Brute-force lockout config
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

// Token TTLs
const ACCESS_TOKEN_EXPIRY = '15m';   // Short-lived access token
const REFRESH_TOKEN_EXPIRY_DAYS = 7; // Refresh token valid 7 days

// ─── Helpers ────────────────────────────────────────────────

/** Generate a unique JWT ID for token blacklisting */
const generateJti = () => crypto.randomBytes(16).toString('hex');

/** Hash a refresh token before storing (never store raw token) */
const hashToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');

/** Issue a signed access JWT with a jti claim */
const issueAccessToken = (userId: string, email: string, role: string): string => {
  return jwt.sign(
    { id: userId, email, role, jti: generateJti() },
    CONFIG.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

/** Create and persist a refresh token for the user */
const issueRefreshToken = async (userId: string): Promise<string> => {
  const rawToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: { userId, token: tokenHash, expiresAt },
  });

  return rawToken; // Return raw — client stores this, DB stores hash
};

/** Build role-scoped profile data (never includes passwordHash) */
const buildProfileData = (user: any): any => {
  if (user.role === 'STUDENT') return user.studentProfile;
  if (user.role === 'FACULTY') return user.facultyProfile;
  return user.managementProfile || {
    employeeId: 'MGMT-ZCOER-001',
    firstName: 'Management',
    lastName: 'Officer',
    email: user.email,
    designation: 'Institutional Administrator',
    office: 'Central Administration',
  };
};

// ─── Validation Schemas ─────────────────────────────────────

const loginSchema = z.object({
  email: z.string().optional(),
  usernameOrEmail: z.string().optional(),
  username: z.string().optional(),
  userId: z.string().optional(),
  password: z.string().min(1, 'Password is required'),
});

const provisionUserSchema = z.object({
  email: z.string().email('Valid institutional email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['Faculty', 'Management', 'Student', 'FACULTY', 'MANAGEMENT', 'STUDENT']),
  profile: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().optional(),
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
    employeeId: z.string().optional(),
    designation: z.string().optional(),
    qualification: z.string().optional(),
    maxWeeklyHours: z.number().int().optional(),
    office: z.string().optional(),
  }),
});

// ─── Controller ─────────────────────────────────────────────

export class AuthController {

  /**
   * POST /auth/login
   * Issues a short-lived access token (15m) + a long-lived refresh token (7d).
   * Enforces brute-force lockout after 5 failed attempts.
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = loginSchema.parse(req.body);
      const rawIdentifier = (
        parsed.email || parsed.usernameOrEmail || parsed.username || parsed.userId || ''
      ).trim();
      const password = parsed.password;

      if (!rawIdentifier) {
        throw new AppError('Email address, PRN, or User ID is required.', 400);
      }

      const identifierLower = rawIdentifier.toLowerCase();

      // Multi-identifier DB lookup
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: { equals: identifierLower } },
            { studentProfile: { OR: [{ enrollmentNumber: rawIdentifier }, { rollNumber: rawIdentifier }, { email: identifierLower }] } },
            { facultyProfile: { OR: [{ employeeId: rawIdentifier }, { email: identifierLower }] } },
            { managementProfile: { OR: [{ employeeId: rawIdentifier }, { email: identifierLower }] } },
          ],
        },
        include: {
          studentProfile: { include: { department: true, program: true, batch: true, section: true } },
          facultyProfile: { include: { department: true } },
          managementProfile: true,
        },
      });

      // Shortname fallback: 'superadmin' → 'superadmin@...'
      if (!user && !rawIdentifier.includes('@')) {
        user = await prisma.user.findFirst({
          where: { email: { startsWith: `${identifierLower}@` } },
          include: {
            studentProfile: { include: { department: true, program: true, batch: true, section: true } },
            facultyProfile: { include: { department: true } },
            managementProfile: true,
          },
        });
      }

      // Unknown user — constant-time dummy compare to prevent enumeration
      if (!user) {
        await bcrypt.compare(password, DUMMY_HASH);
        throw new AppError('Invalid email or password.', 401);
      }

      // Account disabled
      if (user.status !== 'ACTIVE') {
        throw new AppError('Account is disabled. Please contact the management team.', 403);
      }

      // Brute-force lockout check
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
        throw new AppError(
          `Account temporarily locked due to too many failed attempts. Try again in ${minutesLeft} minute(s).`,
          423
        );
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        const newFailCount = (user.failedLoginCount || 0) + 1;
        const shouldLock = newFailCount >= MAX_FAILED_ATTEMPTS;

        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginCount: newFailCount,
            lockedUntil: shouldLock
              ? new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000)
              : undefined,
          },
        });

        if (shouldLock) {
          throw new AppError(
            `Too many failed attempts. Account locked for ${LOCK_DURATION_MINUTES} minutes.`,
            423
          );
        }

        throw new AppError('Invalid email or password.', 401);
      }

      // Reset failed attempts on successful login
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          loginCount: { increment: 1 },
          failedLoginCount: 0,
          lockedUntil: null,
        },
      });

      // Issue tokens
      const accessToken = issueAccessToken(user.id, user.email, user.role);
      const refreshToken = await issueRefreshToken(user.id);

      res.json({
        success: true,
        message: 'Login successful.',
        data: {
          token: accessToken,
          refreshToken,
          expiresIn: 15 * 60, // seconds
          user: { id: user.id, email: user.email, role: user.role, status: user.status },
          profile: buildProfileData(user),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/logout
   * Blacklists the current access token and revokes the refresh token.
   */
  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      const { refreshToken } = req.body;

      // Blacklist the access token by its jti
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          const decoded = jwt.decode(token) as any;
          if (decoded?.jti && decoded?.exp) {
            await prisma.tokenBlacklist.create({
              data: {
                jti: decoded.jti,
                expiresAt: new Date(decoded.exp * 1000),
              },
            }).catch(() => {}); // ignore if already blacklisted
          }
        } catch {
          // malformed token — no action needed
        }
      }

      // Revoke the refresh token
      if (refreshToken) {
        const tokenHash = hashToken(refreshToken);
        await prisma.refreshToken.updateMany({
          where: { token: tokenHash, revokedAt: null },
          data: { revokedAt: new Date() },
        }).catch(() => {});
      }

      res.json({ success: true, message: 'Logged out successfully.' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/refresh
   * Exchanges a valid refresh token for a new access token (token rotation).
   */
  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new AppError('Refresh token is required.', 400);
      }

      const tokenHash = hashToken(refreshToken);

      const stored = await prisma.refreshToken.findUnique({
        where: { token: tokenHash },
        include: { user: true },
      });

      if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
        throw new AppError('Invalid or expired refresh token. Please log in again.', 401);
      }

      if (stored.user.status !== 'ACTIVE') {
        throw new AppError('Account is disabled.', 403);
      }

      // Rotate: revoke old, issue new refresh token
      await prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });

      const newAccessToken = issueAccessToken(stored.user.id, stored.user.email, stored.user.role);
      const newRefreshToken = await issueRefreshToken(stored.user.id);

      res.json({
        success: true,
        data: {
          token: newAccessToken,
          refreshToken: newRefreshToken,
          expiresIn: 15 * 60,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /auth/profile
   * Returns current user's profile based on their verified JWT.
   */
  static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required.', 401);

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true, email: true, role: true, status: true, createdAt: true,
          studentProfile: {
            include: {
              department: { select: { id: true, code: true, name: true } },
              program: { select: { id: true, code: true, name: true, degreeType: true } },
              batch: { select: { id: true, name: true, academicYear: true, currentSemester: true } },
              section: { select: { id: true, name: true, roomNumber: true } },
            },
          },
          facultyProfile: { include: { department: { select: { id: true, code: true, name: true } } } },
          managementProfile: true,
        },
      });

      if (!user) throw new AppError('User not found.', 404);
      if (user.status !== 'ACTIVE') throw new AppError('Account is disabled.', 403);

      let profileData: any = null;
      if (user.role === 'STUDENT') profileData = user.studentProfile;
      else if (user.role === 'FACULTY') profileData = user.facultyProfile;
      else profileData = user.managementProfile;

      res.json({
        success: true,
        data: {
          id: user.id, email: user.email, role: user.role, status: user.status, createdAt: user.createdAt,
          studentProfile: user.studentProfile,
          facultyProfile: user.facultyProfile,
          managementProfile: user.managementProfile,
          profile: profileData,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /auth/me — alias for getProfile
   */
  static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    return AuthController.getProfile(req, res, next);
  }

  /**
   * POST /auth/change-password
   * Requires current password verification before allowing the change.
   */
  static async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Authentication required.', 401);

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        throw new AppError('Both current and new password are required.', 400);
      }

      if (newPassword.length < 8) {
        throw new AppError('New password must be at least 8 characters.', 400);
      }

      if (currentPassword === newPassword) {
        throw new AppError('New password must be different from the current password.', 400);
      }

      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (!user) throw new AppError('User not found.', 404);

      // Verify current password before allowing change
      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) {
        throw new AppError('Current password is incorrect.', 401);
      }

      const newHash = await bcrypt.hash(newPassword, 12);

      // Update password and revoke ALL existing refresh tokens (force re-login on other devices)
      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: newHash },
        }),
        prisma.refreshToken.updateMany({
          where: { userId: user.id, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
      ]);

      res.json({ success: true, message: 'Password changed successfully. Please log in again on other devices.' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/provision
   * Management-only: creates a new user account with a hashed password.
   */
  static async provisionUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, role, profile } = provisionUserSchema.parse(req.body);
      const emailNormalized = email.toLowerCase().trim();

      let canonicalRole: 'FACULTY' | 'MANAGEMENT' | 'STUDENT';
      const roleUpper = role.toUpperCase();
      if (roleUpper === 'FACULTY') canonicalRole = 'FACULTY';
      else if (['MANAGEMENT', 'ADMIN', 'SUPER_ADMIN'].includes(roleUpper)) canonicalRole = 'MANAGEMENT';
      else canonicalRole = 'STUDENT';

      const existingUser = await prisma.user.findUnique({ where: { email: emailNormalized } });
      if (existingUser) throw new AppError('A user with this email has already been provisioned.', 409);

      // Hash password — never store plaintext
      const passwordHash = await bcrypt.hash(password, 12);

      // Resolve department
      let departmentId = profile.departmentId;
      if (!departmentId && profile.departmentCode) {
        const dept = await prisma.department.findUnique({ where: { code: profile.departmentCode.toUpperCase() } });
        if (dept) departmentId = dept.id;
      }
      if (!departmentId && canonicalRole !== 'MANAGEMENT') {
        const firstDept = await prisma.department.findFirst();
        if (firstDept) departmentId = firstDept.id;
      }

      // Resolve program & batch for students
      let programId = profile.programId;
      let batchId = profile.batchId;
      if (canonicalRole === 'STUDENT') {
        if (!programId) {
          const prog = await prisma.program.findFirst({ where: departmentId ? { departmentId } : undefined });
          if (prog) programId = prog.id;
        }
        if (!batchId && programId) {
          const batch = await prisma.batch.findFirst({ where: { programId } });
          if (batch) batchId = batch.id;
        }
      }

      const result = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: { email: emailNormalized, passwordHash, role: canonicalRole, status: 'ACTIVE' },
          select: { id: true, email: true, role: true, status: true, createdAt: true },
        });

        let createdProfile: any = null;

        if (canonicalRole === 'STUDENT') {
          const rollNumber = profile.rollNumber || `ZCOER-${profile.departmentCode || 'ENG'}-${Math.floor(1000 + Math.random() * 9000)}`;
          const enrollmentNumber = profile.enrollmentNumber || `10322${Math.floor(10000 + Math.random() * 90000)}`;
          createdProfile = await tx.student.create({
            data: {
              userId: newUser.id, firstName: profile.firstName, lastName: profile.lastName,
              email: emailNormalized, rollNumber, enrollmentNumber,
              phone: profile.phone || '9876543210', gender: profile.gender || 'OTHER',
              dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth) : new Date('2004-01-01'),
              currentSemester: profile.currentSemester || 1,
              departmentId: departmentId!, programId: programId!, batchId: batchId!,
              sectionId: profile.sectionId || null, bloodGroup: profile.bloodGroup || 'O+',
              address: profile.address || 'Pune, Maharashtra',
              guardianName: profile.guardianName || 'Guardian',
              guardianPhone: profile.guardianPhone || '9876500000',
            },
            include: { department: true, program: true, batch: true, section: true },
          });
        } else if (canonicalRole === 'FACULTY') {
          const employeeId = profile.employeeId || `FAC-ZCOER-${Math.floor(100 + Math.random() * 900)}`;
          createdProfile = await tx.faculty.create({
            data: {
              userId: newUser.id, firstName: profile.firstName, lastName: profile.lastName,
              email: emailNormalized, employeeId, phone: profile.phone || '9876543210',
              designation: profile.designation || 'Assistant Professor',
              qualification: profile.qualification || 'M.Tech / Ph.D in Engineering',
              departmentId: departmentId!, maxWeeklyHours: profile.maxWeeklyHours || 18,
            },
            include: { department: true },
          });
        } else {
          const employeeId = profile.employeeId || `MGMT-ZCOER-${Math.floor(100 + Math.random() * 900)}`;
          createdProfile = await tx.managementProfile.create({
            data: {
              userId: newUser.id, firstName: profile.firstName, lastName: profile.lastName,
              email: emailNormalized, employeeId, phone: profile.phone || '9876543210',
              designation: profile.designation || 'Dean of Administration',
              office: profile.office || 'Central Administration',
            },
          });
        }

        return { user: newUser, profile: createdProfile };
      });

      res.status(201).json({
        success: true,
        message: `${canonicalRole} account provisioned successfully.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
