import { describe, it, expect, beforeAll } from 'vitest';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/config';
import {
  evaluateExpiry,
  calculateProgress,
  summarizeProgress,
  formatAllottedTime,
  elapsedMinutesSince,
  MAX_EXTRA_LOADS_PER_TOPIC,
} from '../src/services/syllabusProgressService';
import { SyllabusController } from '../src/modules/syllabus/syllabus.controller';
import { requireRoles } from '../src/middleware/rbac';

/**
 * Faculty Academic Load & Syllabus Progress Tracking — verification suite.
 *
 * Covers all required areas:
 *   1. Pure percentage logic: 2 topics / 1 done = 50%
 *   2. Pure time-expiry rule: expiry adds exactly one extra load, never counted toward completion or percentage
 *   3. Deterministic timing rule with various boundary conditions
 *   4. Role permissions: Faculty scoped to own data, Superadmin oversight & load editing
 *   5. Audit trail: Superadmin completion override requires an audit record
 *   6. Credential & login logic: correct credentials succeed, wrong fail, passwords hashed
 */

const now = () => new Date();
const iso = (d: Date) => d.toISOString();
const minutesAgo = (m: number) => new Date(Date.now() - m * 60 * 1000);

async function callController(
  handler: (req: any, res: any, next: any) => Promise<any> | void,
  reqOptions: {
    user?: any;
    params?: any;
    query?: any;
    body?: any;
    headers?: any;
  } = {}
) {
  let statusCode = 200;
  let responseData: any = null;
  let caughtError: any = null;

  const req: any = {
    headers: reqOptions.headers || {},
    params: reqOptions.params || {},
    query: reqOptions.query || {},
    body: reqOptions.body || {},
    user: reqOptions.user,
  };

  const res: any = {
    statusCode: 200,
    status(code: number) {
      statusCode = code;
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      responseData = data;
      return this;
    },
    send(data: any) {
      responseData = data;
      return this;
    },
  };

  const next = (err?: any) => {
    if (err) caughtError = err;
  };

  try {
    await handler(req, res, next);
  } catch (err) {
    caughtError = err;
  }

  return {
    status: caughtError ? caughtError.statusCode || 500 : statusCode,
    body: responseData || (caughtError ? { success: false, message: caughtError.message } : null),
    error: caughtError,
  };
}

function testRoleMiddleware(middleware: any, user?: any) {
  let statusCode = 200;
  let responseData: any = null;
  let calledNext = false;

  const req: any = { user, headers: {} };
  const res: any = {
    statusCode: 200,
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(data: any) {
      responseData = data;
      return this;
    },
  };
  const next = () => {
    calledNext = true;
  };

  middleware(req, res, next);
  return { status: statusCode, body: responseData, calledNext };
}

describe('Faculty Academic Load & Syllabus Progress Tracking', () => {
  let superadminUser: any;
  let facultyAUser: any;
  let facultyBUser: any;
  let facultyAProfile: any;
  let facultyBProfile: any;
  let facultyAId: string;
  let facultyBId: string;
  let facultyAEmail: string;
  let facultyBEmail: string;
  let facultyAEmployeeId: string;
  let facultyBEmployeeId: string;
  let facultyAPassword: string;
  let topicA1Id: string;
  let topicA2Id: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    const saEmail = `syllabus.sa.${timestamp}@zeal.edu.in`;
    facultyAEmail = `syllabus.facultya.${timestamp}@zeal.edu.in`;
    facultyBEmail = `syllabus.facultyb.${timestamp}@zeal.edu.in`;
    facultyAEmployeeId = `FAC-SYLL-A-${timestamp.toString().slice(-6)}`;
    facultyBEmployeeId = `FAC-SYLL-B-${timestamp.toString().slice(-6)}`;
    facultyAPassword = 'FacultyLoad@2026';

    // 1. Create Superadmin User
    superadminUser = await prisma.user.create({
      data: {
        email: saEmail,
        passwordHash: await bcrypt.hash('SuperAdmin@2026', 10),
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
      },
    });

    // 2. Provision Faculty A via SyllabusController.createFaculty
    const saActor = { id: superadminUser.id, email: superadminUser.email, role: 'SUPER_ADMIN' };
    const createA = await callController(SyllabusController.createFaculty, {
      user: saActor,
      body: {
        facultyId: facultyAEmployeeId,
        firstName: 'Anita',
        lastName: 'Rao',
        email: facultyAEmail,
        password: facultyAPassword,
        designation: 'Assistant Professor',
        qualification: 'M.Tech',
        topics: [
          { title: 'Unit A1 — Arrays', allottedMinutes: 5, orderIndex: 0 },
          { title: 'Unit A2 — Linked Lists', allottedMinutes: 60, orderIndex: 1 },
        ],
      },
    });
    expect(createA.status).toBe(201);
    facultyAId = createA.body.data.profile.id;

    // 3. Provision Faculty B via SyllabusController.createFaculty
    const createB = await callController(SyllabusController.createFaculty, {
      user: saActor,
      body: {
        facultyId: facultyBEmployeeId,
        firstName: 'Ravi',
        lastName: 'Menon',
        email: facultyBEmail,
        password: 'FacultyLoad@2026',
        designation: 'Professor',
        qualification: 'Ph.D',
        topics: [{ title: 'Unit B1 — Recursion', allottedMinutes: 60, orderIndex: 0 }],
      },
    });
    expect(createB.status).toBe(201);
    facultyBId = createB.body.data.profile.id;

    // Fetch user records
    facultyAProfile = await prisma.faculty.findUnique({
      where: { id: facultyAId },
      include: { user: true },
    });
    facultyBProfile = await prisma.faculty.findUnique({
      where: { id: facultyBId },
      include: { user: true },
    });
    facultyAUser = facultyAProfile.user;
    facultyBUser = facultyBProfile.user;

    // Fetch Faculty A topics
    const topicsA = await prisma.syllabusTopic.findMany({
      where: { facultyId: facultyAId },
      orderBy: { orderIndex: 'asc' },
    });
    topicA1Id = topicsA[0].id;
    topicA2Id = topicsA[1].id;
  });

  // =========================================================
  // 1. PURE PERCENTAGE LOGIC: 2 topics, 1 done = 50%
  // =========================================================
  describe('1. Pure percentage calculation (calculateProgress)', () => {
    it('returns exactly 50% when 1 of 2 topics is completed', () => {
      expect(calculateProgress(1, 2)).toBe(50);
    });

    it('returns 0% when 0 of 2 topics are completed', () => {
      expect(calculateProgress(0, 2)).toBe(0);
    });

    it('returns 100% when 2 of 2 topics are completed', () => {
      expect(calculateProgress(2, 2)).toBe(100);
    });

    it('handles zero topics safely without divide-by-zero (returns 0%)', () => {
      expect(calculateProgress(0, 0)).toBe(0);
    });

    it('clamps completed count above total to 100%', () => {
      expect(calculateProgress(5, 2)).toBe(100);
    });

    it('formats allotted time properly', () => {
      expect(formatAllottedTime(30)).toBe('30 min');
      expect(formatAllottedTime(60)).toBe('1 hr');
      expect(formatAllottedTime(120)).toBe('2 hr');
      expect(formatAllottedTime(90)).toBe('1.5 hr');
    });
  });

  // =========================================================
  // 2. PURE TIME-EXPIRY RULE: exactly 1 extra load
  // =========================================================
  describe('2. Deterministic time-expiry rule (evaluateExpiry)', () => {
    it('does not add extra load while within the allotted time', () => {
      const r = evaluateExpiry({
        allottedMinutes: 120,
        elapsedMinutes: 90,
        completed: false,
        extraLoadsAdded: 0,
      });
      expect(r.shouldAddExtraLoad).toBe(false);
      expect(r.isExpired).toBe(false);
      expect(r.isOverdue).toBe(false);
      expect(r.remainingMinutesInPeriod).toBe(30);
    });

    it('adds exactly one extra load when allotted time expires without completion', () => {
      const r = evaluateExpiry({
        allottedMinutes: 120,
        elapsedMinutes: 130,
        completed: false,
        extraLoadsAdded: 0,
      });
      expect(r.shouldAddExtraLoad).toBe(true);
      expect(r.isExpired).toBe(true);
      expect(r.isOverdue).toBe(false);
      expect(r.extraLoadCap).toBe(1);
    });

    it('does NOT add a second extra load after one has already been recorded', () => {
      const r = evaluateExpiry({
        allottedMinutes: 120,
        elapsedMinutes: 130,
        completed: false,
        extraLoadsAdded: 1,
      });
      expect(r.shouldAddExtraLoad).toBe(false);
      expect(r.extraLoadCap).toBe(MAX_EXTRA_LOADS_PER_TOPIC);
      expect(MAX_EXTRA_LOADS_PER_TOPIC).toBe(1);
    });

    it('marks topic overdue (past original + extra period) but does not add extra load', () => {
      const r = evaluateExpiry({
        allottedMinutes: 120,
        elapsedMinutes: 500,
        completed: false,
        extraLoadsAdded: 1,
      });
      expect(r.shouldAddExtraLoad).toBe(false);
      expect(r.isOverdue).toBe(true);
    });

    it('never adds extra load for a completed topic even if time has elapsed', () => {
      const r = evaluateExpiry({
        allottedMinutes: 120,
        elapsedMinutes: 500,
        completed: true,
        extraLoadsAdded: 0,
      });
      expect(r.shouldAddExtraLoad).toBe(false);
      expect(r.isExpired).toBe(false);
      expect(r.isOverdue).toBe(false);
    });
  });

  // =========================================================
  // 3. INTEGRATION: 2 topics / 1 done = 50%
  // =========================================================
  describe('3. Integration: 2-topic load and 50% progress update', () => {
    it('reports 0% before any topic is marked done', async () => {
      const res = await callController(SyllabusController.getMyLoad, {
        user: { id: facultyAUser.id, email: facultyAUser.email, role: 'FACULTY', facultyId: facultyAId },
      });
      expect(res.status).toBe(200);
      expect(res.body.data.summary.totalTopics).toBe(2);
      expect(res.body.data.summary.completedTopics).toBe(0);
      expect(res.body.data.summary.percentage).toBe(0);
    });

    it('reports 50% after exactly one of two topics is marked done', async () => {
      const mark = await callController(SyllabusController.markMyTopicDone, {
        user: { id: facultyAUser.id, email: facultyAUser.email, role: 'FACULTY', facultyId: facultyAId },
        params: { topicId: topicA2Id },
      });
      expect(mark.status).toBe(200);

      const res = await callController(SyllabusController.getMyLoad, {
        user: { id: facultyAUser.id, email: facultyAUser.email, role: 'FACULTY', facultyId: facultyAId },
      });
      expect(res.status).toBe(200);
      expect(res.body.data.summary.totalTopics).toBe(2);
      expect(res.body.data.summary.completedTopics).toBe(1);
      expect(res.body.data.summary.percentage).toBe(50);

      const doneTopic = res.body.data.topics.find((t: any) => t.topicId === topicA2Id);
      expect(doneTopic.status).toBe('DONE');
      expect(doneTopic.completedAt).not.toBeNull();
    });
  });

  // =========================================================
  // 4. INTEGRATION: Expiry adds extra load that does not affect %
  // =========================================================
  describe('4. Integration: Expiry adds extra load that does NOT count toward %', () => {
    it('adds exactly one extra load when allotted time expires without completion', async () => {
      // Simulate Unit A1 assigned 15 minutes ago (allotted is 5 minutes -> expired)
      await prisma.syllabusTopic.update({
        where: { id: topicA1Id },
        data: { assignedAt: minutesAgo(15) },
      });

      // Reading load triggers syncExtraLoadsForFaculty
      const res1 = await callController(SyllabusController.getMyLoad, {
        user: { id: facultyAUser.id, email: facultyAUser.email, role: 'FACULTY', facultyId: facultyAId },
      });
      expect(res1.status).toBe(200);
      const t1 = res1.body.data.topics.find((t: any) => t.topicId === topicA1Id);
      expect(t1.extraLoads).toBe(1);
      expect(t1.status).toBe('PENDING');

      // Subsequent read does not add another extra load
      const res2 = await callController(SyllabusController.getMyLoad, {
        user: { id: facultyAUser.id, email: facultyAUser.email, role: 'FACULTY', facultyId: facultyAId },
      });
      const t2 = res2.body.data.topics.find((t: any) => t.topicId === topicA1Id);
      expect(t2.extraLoads).toBe(1);
    });

    it('keeps extra loads completely separate from the progress percentage', async () => {
      // Unit A1 has 1 extra load and is pending; Unit A2 is completed.
      const res = await callController(SyllabusController.getMyLoad, {
        user: { id: facultyAUser.id, email: facultyAUser.email, role: 'FACULTY', facultyId: facultyAId },
      });
      // Percentage must still be 50%, NOT altered by the extra load!
      expect(res.body.data.summary.percentage).toBe(50);
      expect(res.body.data.summary.totalExtraLoads).toBe(1);
      expect(res.body.data.summary.completedTopics).toBe(1);
      expect(res.body.data.summary.totalTopics).toBe(2);

      // Now mark Unit A1 done
      const mark = await callController(SyllabusController.markMyTopicDone, {
        user: { id: facultyAUser.id, email: facultyAUser.email, role: 'FACULTY', facultyId: facultyAId },
        params: { topicId: topicA1Id },
      });
      expect(mark.status).toBe(200);
      expect(mark.body.data.summary.percentage).toBe(100);
      expect(mark.body.data.summary.completedTopics).toBe(2);
      expect(mark.body.data.summary.totalExtraLoads).toBe(1); // Still 1 extra load recorded
    });

    it('summarizeProgress pure helper keeps extra loads out of percentage', () => {
      const summary = summarizeProgress([
        {
          topicId: '1',
          title: 'Topic 1',
          description: null,
          orderIndex: 0,
          allottedMinutes: 60,
          status: 'DONE',
          completedAt: iso(now()),
          extraLoads: 0,
          expiry: { shouldAddExtraLoad: false, isExpired: false, isOverdue: false, extraLoadCap: 1, periodsElapsed: 0, remainingMinutesInPeriod: 0 },
        },
        {
          topicId: '2',
          title: 'Topic 2',
          description: null,
          orderIndex: 1,
          allottedMinutes: 60,
          status: 'PENDING',
          completedAt: null,
          extraLoads: 1,
          expiry: { shouldAddExtraLoad: false, isExpired: true, isOverdue: false, extraLoadCap: 1, periodsElapsed: 1, remainingMinutesInPeriod: 0 },
        },
      ]);
      expect(summary.completedTopics).toBe(1);
      expect(summary.totalTopics).toBe(2);
      expect(summary.percentage).toBe(50);
      expect(summary.totalExtraLoads).toBe(1);
    });
  });

  // =========================================================
  // 5. ROLE PERMISSIONS & ACCESS CONTROL
  // =========================================================
  describe('5. Role-based access control and scoping', () => {
    it('requireRoles allows matching role and denies unauthorized roles', () => {
      const facultyCheck = requireRoles('FACULTY');
      const superadminCheck = requireRoles('SUPER_ADMIN');

      // Unauthenticated
      expect(testRoleMiddleware(facultyCheck).status).toBe(401);

      // Student accessing faculty endpoint
      expect(testRoleMiddleware(facultyCheck, { role: 'STUDENT' }).status).toBe(403);

      // Faculty accessing faculty endpoint
      const facAllowed = testRoleMiddleware(facultyCheck, { role: 'FACULTY' });
      expect(facAllowed.calledNext).toBe(true);

      // Faculty accessing superadmin endpoint
      expect(testRoleMiddleware(superadminCheck, { role: 'FACULTY' }).status).toBe(403);

      // Superadmin accessing superadmin endpoint
      const saAllowed = testRoleMiddleware(superadminCheck, { role: 'SUPER_ADMIN' });
      expect(saAllowed.calledNext).toBe(true);
    });

    it('denies a faculty member accessing another faculty member topic', async () => {
      // Faculty B has topic B1
      const topicsB = await prisma.syllabusTopic.findMany({ where: { facultyId: facultyBId } });
      const topicBId = topicsB[0].id;

      // Faculty A tries to mark Faculty B topic done
      const res = await callController(SyllabusController.markMyTopicDone, {
        user: { id: facultyAUser.id, email: facultyAUser.email, role: 'FACULTY', facultyId: facultyAId },
        params: { topicId: topicBId },
      });
      expect(res.status).toBe(403);
    });

    it('lets Superadmin view all faculty members and their load progress', async () => {
      const res = await callController(SyllabusController.listAllFacultyProgress, {
        user: { id: superadminUser.id, email: superadminUser.email, role: 'SUPER_ADMIN' },
      });
      expect(res.status).toBe(200);
      const facultyList = res.body.data.faculty;
      expect(facultyList.length).toBeGreaterThanOrEqual(2);
      const a = facultyList.find((f: any) => f.facultyId === facultyAId);
      const b = facultyList.find((f: any) => f.facultyId === facultyBId);
      expect(a).toBeDefined();
      expect(b).toBeDefined();
    });

    it('lets Superadmin edit a faculty member academic load', async () => {
      const res = await callController(SyllabusController.setFacultyLoad, {
        user: { id: superadminUser.id, email: superadminUser.email, role: 'SUPER_ADMIN' },
        params: { id: facultyBId },
        body: {
          topics: [
            { title: 'New Unit B1 — Stacks', allottedMinutes: 45, orderIndex: 0 },
            { title: 'New Unit B2 — Queues', allottedMinutes: 45, orderIndex: 1 },
          ],
        },
      });
      expect(res.status).toBe(200);
      expect(res.body.data.summary.totalTopics).toBe(2);
      expect(res.body.data.summary.completedTopics).toBe(0);
      expect(res.body.data.summary.percentage).toBe(0);
    });

    it('records an audit trail when Superadmin overrides a completion record', async () => {
      const topicsB = await prisma.syllabusTopic.findMany({ where: { facultyId: facultyBId } });
      const targetTopic = topicsB[0];
      expect(targetTopic.status).toBe('PENDING');

      // Superadmin overrides to DONE
      const res = await callController(SyllabusController.overrideCompletion, {
        user: { id: superadminUser.id, email: superadminUser.email, role: 'SUPER_ADMIN' },
        params: { id: facultyBId, topicId: targetTopic.id },
        body: { status: 'DONE', note: 'Administrative verification completed' },
      });
      expect(res.status).toBe(200);

      // Verify audit record was created in database
      const audit = await prisma.syllabusCompletionAudit.findFirst({
        where: { topicId: targetTopic.id, action: 'SUPERADMIN_OVERRIDE' },
      });
      expect(audit).toBeDefined();
      expect(audit?.actorUserId).toBe(superadminUser.id);
      expect(audit?.note).toBe('Administrative verification completed');
      expect(JSON.parse(audit?.newValue || '{}').status).toBe('DONE');
    });
  });

  // =========================================================
  // 6. CREDENTIALS & LOGIN VERIFICATION
  // =========================================================
  describe('6. Login credentials & password security', () => {
    it('verifies password hashing and prevents plain text storage', async () => {
      const user = await prisma.user.findUnique({ where: { email: facultyAEmail } });
      expect(user).toBeDefined();
      expect(user?.passwordHash).not.toBe(facultyAPassword);
      expect(user?.passwordHash.startsWith('$2')).toBe(true);

      const isValid = await bcrypt.compare(facultyAPassword, user!.passwordHash);
      expect(isValid).toBe(true);

      const isInvalid = await bcrypt.compare('WrongPassword@999', user!.passwordHash);
      expect(isInvalid).toBe(false);
    });
  });
});
