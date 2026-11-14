import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../config';
import { AppError } from '../../middleware/errorHandler';
import {
  evaluateExpiry,
  elapsedMinutesSince,
  summarizeProgress,
  formatAllottedTime,
  TopicProgressView,
  TopicStatus,
} from '../../services/syllabusProgressService';

// ─── Validation schemas ─────────────────────────────────────

const topicInputSchema = z.object({
  title: z.string().min(1, 'Topic title is required').max(200),
  description: z.string().max(1000).optional(),
  allottedMinutes: z.number().int().positive('Allotted time must be a positive number of minutes'),
  orderIndex: z.number().int().min(0).optional(),
});

const createFacultySchema = z.object({
  facultyId: z.string().min(2, 'Faculty ID is required').max(50),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.string().email('A valid institutional email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().min(4).max(20).optional(),
  designation: z.string().min(1).max(80).optional(),
  qualification: z.string().max(120).optional(),
  departmentId: z.string().uuid().optional(),
  departmentCode: z.string().max(20).optional(),
  maxWeeklyHours: z.number().int().min(1).max(60).optional(),
  topics: z.array(topicInputSchema).optional(), // initial academic load
});

const updateFacultySchema = z.object({
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(4).max(20).optional(),
  designation: z.string().min(1).max(80).optional(),
  qualification: z.string().max(120).optional(),
  departmentId: z.string().uuid().optional(),
  departmentCode: z.string().max(20).optional(),
  maxWeeklyHours: z.number().int().min(1).max(60).optional(),
  // When provided, the password is re-hashed and stored (Superadmin reset).
  password: z.string().min(6).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'DISABLED']).optional(),
});

const loadSchema = z.object({
  topics: z.array(topicInputSchema),
});

const overrideSchema = z.object({
  status: z.enum(['DONE', 'PENDING']),
  note: z.string().max(500).optional(),
});

// ─── Helpers ────────────────────────────────────────────────

/**
 * Resolves a department for provisioning. Precedence: explicit departmentId,
 * then departmentCode, then the first department in the system. This keeps
 * the module self-contained for tests and avoids hard coupling to seed data.
 */
async function resolveDepartment(
  departmentId?: string,
  departmentCode?: string
): Promise<{ id: string; code: string; name: string }> {
  if (departmentId) {
    const dept = await prisma.department.findUnique({ where: { id: departmentId } });
    if (dept) return dept;
  }
  if (departmentCode) {
    const dept = await prisma.department.findUnique({ where: { code: departmentCode } });
    if (dept) return dept;
  }
  let first = await prisma.department.findFirst({ orderBy: { code: 'asc' } });
  if (!first) {
    first = await prisma.department.create({
      data: { code: 'GEN', name: 'General Studies' },
    });
  }
  return first;
}

/**
 * Applies the pure expiry rule to every non-completed topic for a faculty
 * and persists exactly one extra-load record where the rule demands it.
 *
 * This is the only place that writes SyllabusExtraLoad rows, and it is
 * idempotent: once a topic has its single allowed extra load, the rule
 * returns shouldAddExtraLoad = false and nothing more is ever created.
 */
export async function syncExtraLoadsForFaculty(
  facultyId: string,
  now: Date = new Date()
): Promise<void> {
  const topics = await prisma.syllabusTopic.findMany({
    where: { facultyId },
    include: { extraLoads: { select: { id: true } } },
  });

  for (const topic of topics) {
    if (topic.status === 'DONE') continue;
    const elapsed = elapsedMinutesSince(topic.assignedAt, now);
    const result = evaluateExpiry({
      allottedMinutes: topic.allottedMinutes,
      elapsedMinutes: elapsed,
      completed: false,
      extraLoadsAdded: topic.extraLoads.length,
    });
    if (result.shouldAddExtraLoad) {
      await prisma.syllabusExtraLoad.create({
        data: { topicId: topic.id, facultyId, reason: 'TIME_EXPIRED' },
      });
    }
  }
}

/** Builds the pure-data view of one topic, including its expiry evaluation. */
async function buildTopicView(
  topic: {
    id: string;
    title: string;
    description: string | null;
    orderIndex: number;
    allottedMinutes: number;
    assignedAt: Date;
    status: string;
    completedAt: Date | null;
    completedByUserId: string | null;
    extraLoads: { id: string }[];
  },
  now: Date
): Promise<TopicProgressView> {
  const completed = topic.status === 'DONE';
  const elapsed = completed ? 0 : elapsedMinutesSince(topic.assignedAt, now);
  const expiry = evaluateExpiry({
    allottedMinutes: topic.allottedMinutes,
    elapsedMinutes: elapsed,
    completed,
    extraLoadsAdded: topic.extraLoads.length,
  });
  return {
    topicId: topic.id,
    title: topic.title,
    description: topic.description,
    orderIndex: topic.orderIndex,
    allottedMinutes: topic.allottedMinutes,
    status: (completed ? 'DONE' : 'PENDING') as TopicStatus,
    completedAt: topic.completedAt ? topic.completedAt.toISOString() : null,
    extraLoads: topic.extraLoads.length,
    expiry,
  };
}

/** Fetches a faculty's topics (with extra loads) ordered, as pure views. */
async function getTopicViews(facultyId: string, now: Date): Promise<TopicProgressView[]> {
  const topics = await prisma.syllabusTopic.findMany({
    where: { facultyId },
    include: { extraLoads: { select: { id: true } } },
    orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
  });
  return Promise.all(topics.map((t) => buildTopicView(t, now)));
}

interface FacultyProfileDto {
  id: string;
  facultyId: string; // employeeId — the unique login ID
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  designation: string;
  qualification: string;
  department: { id: string; code: string; name: string };
  status: string;
}

async function buildFacultyProfile(facultyId: string): Promise<FacultyProfileDto> {
  const f = await prisma.faculty.findUnique({
    where: { id: facultyId },
    include: { department: { select: { id: true, code: true, name: true } }, user: { select: { status: true } } },
  });
  if (!f) throw new AppError('Faculty member not found.', 404);
  return {
    id: f.id,
    facultyId: f.employeeId,
    firstName: f.firstName,
    lastName: f.lastName,
    fullName: `${f.firstName} ${f.lastName}`,
    email: f.email,
    phone: f.phone,
    designation: f.designation,
    qualification: f.qualification,
    department: f.department,
    status: f.user?.status ?? 'ACTIVE',
  };
}

/** Full progress payload for one faculty: profile, ordered topics, summary. */
async function buildFacultyProgress(facultyId: string, now: Date = new Date()) {
  await syncExtraLoadsForFaculty(facultyId, now);
  const profile = await buildFacultyProfile(facultyId);
  const topicViews = await getTopicViews(facultyId, now);
  const summary = summarizeProgress(topicViews);
  return {
    profile,
    topics: topicViews.map((t) => ({
      ...t,
      allottedTimeLabel: formatAllottedTime(t.allottedMinutes),
    })),
    summary,
  };
}

function assertOwnsTopic(
  topic: { facultyId: string } | null,
  facultyId: string,
  topicId: string
): asserts topic is { facultyId: string } {
  if (!topic) throw new AppError('Topic not found.', 404);
  if (topic.facultyId !== facultyId) {
    throw new AppError('Forbidden: You can only access your own syllabus load.', 403);
  }
}

// ─── Controller ──────────────────────────────────────────────

export class SyllabusController {
  // ── Faculty: own load ──

  /** GET /syllabus/me — the signed-in faculty's own load + live progress. */
  static async getMyLoad(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const facultyId = req.user?.facultyId;
      if (!facultyId) throw new AppError('No faculty profile linked to this account.', 403);

      const data = await buildFacultyProgress(facultyId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /syllabus/me/topics/:topicId/done — mark a topic done for the
   * current day. Faculty may only touch their own topics. Completion is
   * timestamped to now (no back-dating) and an audit row is written.
   */
  static async markMyTopicDone(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const facultyId = req.user?.facultyId;
      const userId = req.user?.id;
      const actorEmail = req.user?.email;
      if (!facultyId || !userId) throw new AppError('No faculty profile linked to this account.', 403);

      const { topicId } = req.params;
      const topic = await prisma.syllabusTopic.findUnique({
        where: { id: topicId },
        select: { id: true, facultyId: true, status: true, completedAt: true, completedByUserId: true },
      });
      assertOwnsTopic(topic, facultyId, topicId);

      const now = new Date();
      // Evaluate expiry BEFORE completion so an already-expired original
      // period correctly records its one extra load first.
      await syncExtraLoadsForFaculty(facultyId, now);

      if (topic.status === 'DONE') {
        const data = await buildFacultyProgress(facultyId, now);
        res.json({ success: true, message: 'Topic already marked done.', data });
        return;
      }

      const oldValue = {
        status: topic.status,
        completedAt: topic.completedAt,
        completedByUserId: topic.completedByUserId,
      };

      await prisma.$transaction(async (tx) => {
        await tx.syllabusTopic.update({
          where: { id: topicId },
          data: { status: 'DONE', completedAt: now, completedByUserId: userId },
        });
        await tx.syllabusCompletionAudit.create({
          data: {
            topicId,
            facultyId,
            actorUserId: userId,
            actorEmail,
            action: 'FACULTY_MARK_DONE',
            oldValue: JSON.stringify(oldValue),
            newValue: JSON.stringify({
              status: 'DONE',
              completedAt: now.toISOString(),
              completedByUserId: userId,
            }),
          },
        });
      });

      const data = await buildFacultyProgress(facultyId, now);
      res.json({ success: true, message: 'Topic marked done for today.', data });
    } catch (error) {
      next(error);
    }
  }

  // ── Superadmin: overview of all faculty ──

  /** GET /syllabus — progress + extra-load counts for every faculty member. */
  static async listAllFacultyProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const now = new Date();
      const faculty = await prisma.faculty.findMany({
        include: {
          department: { select: { id: true, code: true, name: true } },
          user: { select: { status: true, email: true } },
          syllabusTopics: {
            include: { extraLoads: { select: { id: true } } },
            orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
          },
        },
        orderBy: { firstName: 'asc' },
      });

      const rows = await Promise.all(
        faculty.map(async (f) => {
          await syncExtraLoadsForFaculty(f.id, now);
          // re-read extra loads after sync to reflect any newly created records
          const topics = await prisma.syllabusTopic.findMany({
            where: { facultyId: f.id },
            include: { extraLoads: { select: { id: true } } },
            orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
          });
          const views = await Promise.all(topics.map((t) => buildTopicView(t, now)));
          const summary = summarizeProgress(views);
          return {
            facultyId: f.id,
            employeeId: f.employeeId,
            name: `${f.firstName} ${f.lastName}`,
            email: f.email,
            designation: f.designation,
            department: f.department,
            status: f.user?.status ?? 'ACTIVE',
            summary,
          };
        })
      );

      const totals = {
        facultyCount: rows.length,
        totalExtraLoads: rows.reduce((s, r) => s + r.summary.totalExtraLoads, 0),
        averagePercentage: Number(
          (
            rows.reduce((s, r) => s + r.summary.percentage, 0) /
            (rows.length || 1)
          ).toFixed(2)
        ),
      };

      res.json({ success: true, data: { faculty: rows, totals } });
    } catch (error) {
      next(error);
    }
  }

  /** GET /syllabus/:facultyId — full detail for one faculty member. */
  static async getFacultyProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { facultyId } = req.params;
      const data = await buildFacultyProgress(facultyId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // ── Superadmin: provision & manage faculty + credentials ──

  /**
   * POST /syllabus/faculty — create a faculty member, provision their
   * credentials (facultyId/employeeId + hashed password), and optionally
   * assign an initial academic load. Returns the new profile (no password).
   */
  static async createFaculty(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createFacultySchema.parse(req.body);
      const email = data.email.toLowerCase().trim();

      if (await prisma.user.findUnique({ where: { email } })) {
        throw new AppError('A user with this email already exists.', 409);
      }
      if (await prisma.faculty.findUnique({ where: { employeeId: data.facultyId } })) {
        throw new AppError('A faculty member with this faculty ID already exists.', 409);
      }

      const department = await resolveDepartment(data.departmentId, data.departmentCode);
      const passwordHash = await bcrypt.hash(data.password, 10);

      const created = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { email, passwordHash, role: 'FACULTY', status: 'ACTIVE' },
        });
        const faculty = await tx.faculty.create({
          data: {
            userId: user.id,
            employeeId: data.facultyId,
            firstName: data.firstName,
            lastName: data.lastName,
            email,
            phone: data.phone ?? '',
            designation: data.designation ?? 'Assistant Professor',
            qualification: data.qualification ?? '',
            departmentId: department.id,
            maxWeeklyHours: data.maxWeeklyHours ?? 18,
          },
        });
        if (data.topics && data.topics.length > 0) {
          await tx.syllabusTopic.createMany({
            data: data.topics.map((t, i) => ({
              facultyId: faculty.id,
              title: t.title,
              description: t.description,
              allottedMinutes: t.allottedMinutes,
              orderIndex: t.orderIndex ?? i,
            })),
          });
        }
        return faculty;
      });

      const profile = await buildFacultyProfile(created.id);
      res.status(201).json({
        success: true,
        message: 'Faculty member provisioned successfully.',
        data: { profile, facultyId: created.employeeId },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /syllabus/faculty/:id — edit a faculty member's profile/credentials.
   * If `password` is supplied, it is re-hashed and stored (Superadmin reset).
   * Never returns a password hash.
   */
  static async updateFaculty(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = updateFacultySchema.parse(req.body);
      const existing = await prisma.faculty.findUnique({
        where: { id },
        include: { user: { select: { id: true } } },
      });
      if (!existing) throw new AppError('Faculty member not found.', 404);

      let departmentId = existing.departmentId;
      if (data.departmentId || data.departmentCode) {
        const dept = await resolveDepartment(data.departmentId, data.departmentCode);
        departmentId = dept.id;
      }

      const userUpdate: any = {};
      if (data.email) {
        const newEmail = data.email.toLowerCase().trim();
        if (newEmail !== existing.email) {
          const clash = await prisma.user.findUnique({ where: { email: newEmail } });
          if (clash && clash.id !== existing.userId) {
            throw new AppError('That email is already in use.', 409);
          }
          userUpdate.email = newEmail;
        }
      }
      if (data.password) userUpdate.passwordHash = await bcrypt.hash(data.password, 10);
      if (data.status) userUpdate.status = data.status;

      await prisma.$transaction(async (tx) => {
        if (Object.keys(userUpdate).length > 0) {
          await tx.user.update({ where: { id: existing.userId }, data: userUpdate });
        }
        await tx.faculty.update({
          where: { id },
          data: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email?.toLowerCase().trim(),
            phone: data.phone,
            designation: data.designation,
            qualification: data.qualification,
            departmentId,
            maxWeeklyHours: data.maxWeeklyHours,
          },
        });
      });

      const profile = await buildFacultyProfile(id);
      res.json({
        success: true,
        message: data.password ? 'Faculty updated and password reset.' : 'Faculty updated.',
        data: { profile, passwordReset: Boolean(data.password) },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /syllabus/faculty/:id/load — replace a faculty member's entire
   * academic load (topics + allotted times). Existing completion records
   * and extra loads are dropped because the load definition changed.
   */
  static async setFacultyLoad(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = loadSchema.parse(req.body);
      const existing = await prisma.faculty.findUnique({ where: { id } });
      if (!existing) throw new AppError('Faculty member not found.', 404);

      await prisma.$transaction(async (tx) => {
        // Cascade deletes handle extra loads + audits tied to old topics.
        await tx.syllabusTopic.deleteMany({ where: { facultyId: id } });
        if (data.topics.length > 0) {
          await tx.syllabusTopic.createMany({
            data: data.topics.map((t, i) => ({
              facultyId: id,
              title: t.title,
              description: t.description,
              allottedMinutes: t.allottedMinutes,
              orderIndex: t.orderIndex ?? i,
            })),
          });
        }
      });

      const result = await buildFacultyProgress(id);
      res.json({
        success: true,
        message: `Academic load set to ${data.topics.length} topic(s).`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /syllabus/faculty/:id/topics/:topicId/override — Superadmin alters a
   * completion record. ALWAYS writes an audit trail (who/what/when/old/new).
   * If the audit write fails the whole change rolls back.
   */
  static async overrideCompletion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, topicId } = req.params;
      const data = overrideSchema.parse(req.body);
      const actorUserId = req.user?.id;
      const actorEmail = req.user?.email;
      if (!actorUserId) throw new AppError('Authenticated actor required for audit.', 403);

      const topic = await prisma.syllabusTopic.findUnique({
        where: { id: topicId },
        select: { id: true, facultyId: true, status: true, completedAt: true, completedByUserId: true },
      });
      if (!topic) throw new AppError('Topic not found.', 404);
      if (topic.facultyId !== id) {
        throw new AppError('Topic does not belong to this faculty member.', 400);
      }

      const oldValue = {
        status: topic.status,
        completedAt: topic.completedAt,
        completedByUserId: topic.completedByUserId,
      };
      const newStatus: TopicStatus = data.status;
      const newValue = {
        status: newStatus,
        completedAt: newStatus === 'DONE' ? new Date().toISOString() : null,
        completedByUserId: newStatus === 'DONE' ? actorUserId : null,
      };

      await prisma.$transaction(async (tx) => {
        await tx.syllabusTopic.update({
          where: { id: topicId },
          data: {
            status: newStatus,
            completedAt: newStatus === 'DONE' ? new Date() : null,
            completedByUserId: newStatus === 'DONE' ? actorUserId : null,
          },
        });
        // The audit write is mandatory; if it fails the transaction rolls back.
        await tx.syllabusCompletionAudit.create({
          data: {
            topicId,
            facultyId: id,
            actorUserId,
            actorEmail,
            action: 'SUPERADMIN_OVERRIDE',
            oldValue: JSON.stringify(oldValue),
            newValue: JSON.stringify(newValue),
            note: data.note,
          },
        });
      });

      const result = await buildFacultyProgress(id);
      res.json({
        success: true,
        message: `Completion record overridden to ${newStatus}.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
