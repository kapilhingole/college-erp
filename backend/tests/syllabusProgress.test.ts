import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../src/app';
import { prisma } from '../src/config';
import {
  evaluateExpiry,
  calculateProgress,
  summarizeProgress,
  MAX_EXTRA_LOADS_PER_TOPIC,
} from '../src/services/syllabusProgressService';

/**
 * Faculty Academic Load & Syllabus Progress Tracking — verification suite.
 *
 * Covers the four required areas:
 *   1. Percentage: 2 topics / 1 done = 50%.
 *   2. Expiry: exactly one extra load, never counted toward completion/percentage.
 *   3. Role permissions: faculty scoped to own data, superadmin manages, audit on
 *      superadmin completion overrides.
 *   4. Login: correct credentials succeed, wrong fail, passwords hashed.
 */

const now = () => new Date();
const iso = (d: Date) => d.toISOString();
const minutesAgo = (m: number) => new Date(Date.now() - m * 60 * 1000);

describe('Faculty Academic Load & Syllabus Progress Tracking', () => {
  let superadminToken: string;
  let superadminUserId: string;
  let facultyAToken: string;
  let facultyBToken: string;
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
    // ── Self-contained Superadmin account (role SUPER_ADMIN) ──
    superadminUserId = `sa-syll-${Date.now()}`;
    const saEmail = `syllabus.sa.${Date.now()}@zeal.edu.in`;
    facultyAEmail = `syllabus.facultya.${Date.now()}@zeal.edu.in`;
    facultyBEmail = `syllabus.facultyb.${Date.now()}@zeal.edu.in`;
    facultyAEmployeeId = `FAC-SYLL-A-${Date.now().toString().slice(-6)}`;
    facultyBEmployeeId = `FAC-SYLL-B-${Date.now().toString().slice(-6)}`;
    facultyAPassword = 'FacultyLoad@2026';

    let saUser = await prisma.user.findUnique({ where: { email: saEmail } });
    if (!saUser) {
      saUser = await prisma.user.create({
        data: {
          email: saEmail,
          passwordHash: await bcrypt.hash('SuperAdmin@2026', 10),
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
        },
      });
    }
    superadminUserId = saUser.id;

    const saLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: saEmail, password: 'SuperAdmin@2026' });
    expect(saLogin.status).toBe(200);
    superadminToken = saLogin.body.data.token;

    // ── Provision two faculty members with an academic load ──
    const createA = await request(app)
      .post('/api/v1/syllabus/faculty')
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({
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
      });
    expect(createA.status).toBe(201);
    facultyAId = createA.body.data.profile.id;

    const createB = await request(app)
      .post('/api/v1/syllabus/faculty')
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({
        facultyId: facultyBEmployeeId,
        firstName: 'Ravi',
        lastName: 'Menon',
        email: facultyBEmail,
        password: 'FacultyLoad@2026',
        designation: 'Professor',
        qualification: 'Ph.D',
        topics: [{ title: 'Unit B1 — Recursion', allottedMinutes: 60 }],
      });
    expect(createB.status).toBe(201);
    facultyBId = createB.body.data.profile.id;

    // ── Faculty log in with their credentials ──
    const aLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: facultyAEmail, password: facultyAPassword });
    expect(aLogin.status).toBe(200);
    facultyAToken = aLogin.body.data.token;

    const bLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: facultyBEmail, password: 'FacultyLoad@2026' });
    expect(bLogin.status).toBe(200);
    facultyBToken = bLogin.body.data.token;

    // Capture faculty A topic ids from their own load view (no expiry yet)
    const meA = await request(app)
      .get('/api/v1/syllabus/me')
      .set('Authorization', `Bearer ${facultyAToken}`);
    topicA1Id = meA.body.data.topics.find((t: any) => t.title.startsWith('Unit A1'))?.topicId;
    topicA2Id = meA.body.data.topics.find((t: any) => t.title.startsWith('Unit A2'))?.topicId;
    expect(topicA1Id).toBeDefined();
    expect(topicA2Id).toBeDefined();
  });

  // =========================================================
  // 1. PURE PERCENTAGE LOGIC
  // =========================================================
  describe('calculateProgress — completed/total, extras excluded', () => {
    it('returns 50% for 1 of 2 topics done', () => {
      expect(calculateProgress(1, 2)).toBe(50);
    });

    it('returns 0% when nothing is done', () => {
      expect(calculateProgress(0, 2)).toBe(0);
    });

    it('returns 100% when all are done', () => {
      expect(calculateProgress(2, 2)).toBe(100);
    });

    it('is safe with zero topics (no divide-by-zero)', () => {
      expect(calculateProgress(0, 0)).toBe(0);
    });

    it('clamps a completed count above total back to total', () => {
      expect(calculateProgress(5, 2)).toBe(100);
    });
  });

  // =========================================================
  // 2. PURE TIME-EXPIRY RULE — exactly one extra load
  // =========================================================
  describe('evaluateExpiry — the time-expiry rule', () => {
    it('adds no extra load while within the allotted time', () => {
      const r = evaluateExpiry({ allottedMinutes: 120, elapsedMinutes: 90, completed: false, extraLoadsAdded: 0 });
      expect(r.shouldAddExtraLoad).toBe(false);
      expect(r.isExpired).toBe(false);
      expect(r.isOverdue).toBe(false);
    });

    it('adds exactly one extra load when allotted time expires without completion', () => {
      const r = evaluateExpiry({ allottedMinutes: 120, elapsedMinutes: 130, completed: false, extraLoadsAdded: 0 });
      expect(r.shouldAddExtraLoad).toBe(true);
      expect(r.isExpired).toBe(true);
      expect(r.isOverdue).toBe(false);
    });

    it('does NOT add a second extra load after one has already been added', () => {
      const r = evaluateExpiry({ allottedMinutes: 120, elapsedMinutes: 130, completed: false, extraLoadsAdded: 1 });
      expect(r.shouldAddExtraLoad).toBe(false);
      expect(r.extraLoadCap).toBe(MAX_EXTRA_LOADS_PER_TOPIC);
      expect(MAX_EXTRA_LOADS_PER_TOPIC).toBe(1);
    });

    it('is overdue (but never adds another extra) far past original + extra', () => {
      const r = evaluateExpiry({ allottedMinutes: 120, elapsedMinutes: 1000, completed: false, extraLoadsAdded: 1 });
      expect(r.shouldAddExtraLoad).toBe(false);
      expect(r.isOverdue).toBe(true);
    });

    it('never adds an extra load for a completed topic, even if time lapsed', () => {
      const r = evaluateExpiry({ allottedMinutes: 120, elapsedMinutes: 1000, completed: true, extraLoadsAdded: 0 });
      expect(r.shouldAddExtraLoad).toBe(false);
      expect(r.isExpired).toBe(false);
      expect(r.isOverdue).toBe(false);
    });
  });

  // =========================================================
  // 3. INTEGRATION — 2 topics / 1 done = 50%
  // =========================================================
  describe('Integration: syllabus percentage (2 topics, 1 done = 50%)', () => {
    it('reports 0% before any topic is marked done', async () => {
      const me = await request(app)
        .get('/api/v1/syllabus/me')
        .set('Authorization', `Bearer ${facultyAToken}`);
      expect(me.status).toBe(200);
      expect(me.body.data.summary.totalTopics).toBe(2);
      expect(me.body.data.summary.completedTopics).toBe(0);
      expect(me.body.data.summary.percentage).toBe(0);
    });

    it('reports 50% after exactly one topic is marked done', async () => {
      const mark = await request(app)
        .post(`/api/v1/syllabus/me/topics/${topicA2Id}/done`)
        .set('Authorization', `Bearer ${facultyAToken}`);
      expect(mark.status).toBe(200);

      const me = await request(app)
        .get('/api/v1/syllabus/me')
        .set('Authorization', `Bearer ${facultyAToken}`);
      expect(me.body.data.summary.completedTopics).toBe(1);
      expect(me.body.data.summary.totalTopics).toBe(2);
      expect(me.body.data.summary.percentage).toBe(50);

      const doneTopic = me.body.data.topics.find((t: any) => t.topicId === topicA2Id);
      expect(doneTopic.status).toBe('DONE');
      expect(doneTopic.completedAt).not.toBeNull();
    });
  });

  // =========================================================
  // 4. INTEGRATION — expiry adds exactly one extra load, not counted
  // =========================================================
  describe('Integration: expiry adds exactly one extra load (excluded from %)', () => {
    it('adds one extra load when the allotted time has expired, once only', async () => {
      // Simulate Unit A1's load period having started 10 minutes ago
      // (allotted 5 minutes → already expired).
      await prisma.syllabusTopic.update({
        where: { id: topicA1Id },
        data: { assignedAt: minutesAgo(10) },
      });

      // First read triggers the lazy expiry sync → one extra load.
      const me1 = await request(app)
        .get('/api/v1/syllabus/me')
        .set('Authorization', `Bearer ${facultyAToken}`);
      const t1 = me1.body.data.topics.find((t: any) => t.topicId === topicA1Id);
      expect(t1.extraLoads).toBe(1);
      expect(t1.status).toBe('PENDING');

      // A second read must NOT add a second extra load (exactly one, once).
      const me2 = await request(app)
        .get('/api/v1/syllabus/me')
        .set('Authorization', `Bearer ${facultyAToken}`);
      const t2 = me2.body.data.topics.find((t: any) => t.topicId === topicA1Id);
      expect(t2.extraLoads).toBe(1);

      // Even pushed far past the extra period (overdue) — still exactly one.
      await prisma.syllabusTopic.update({
        where: { id: topicA1Id },
        data: { assignedAt: minutesAgo(1000) },
      });
      const me3 = await request(app)
        .get('/api/v1/syllabus/me')
        .set('Authorization', `Bearer ${facultyAToken}`);
      const t3 = me3.body.data.topics.find((t: any) => t.topicId === topicA1Id);
      expect(t3.extraLoads).toBe(1);
      expect(t3.expiry.isOverdue).toBe(true);
    });

    it('keeps the extra load out of the completion percentage', async () => {
      // Unit A1 has 1 extra load but is still pending; Unit A2 was marked done.
      const me = await request(app)
        .get('/api/v1/syllabus/me')
        .set('Authorization', `Bearer ${facultyAToken}`);
      expect(me.body.data.summary.percentage).toBe(50); // 1 of 2 done
      expect(me.body.data.summary.totalExtraLoads).toBe(1); // tracked separately
      expect(me.body.data.summary.completedTopics).toBe(1);

      // Marking the expired topic done keeps the extra load (it was legitimately
      // added at expiry) and reaches 100% — the extra never inflated the count.
      const mark = await request(app)
        .post(`/api/v1/syllabus/me/topics/${topicA1Id}/done`)
        .set('Authorization', `Bearer ${facultyAToken}`);
      expect(mark.status).toBe(200);
      expect(mark.body.data.summary.percentage).toBe(100);
      expect(mark.body.data.summary.totalExtraLoads).toBe(1);
      expect(mark.body.data.summary.completedTopics).toBe(2);
    });

    it('pure summarizeProgress keeps extra loads separate from percentage', () => {
      const summary = summarizeProgress([
        { topicId: '1', title: 't1', description: null, orderIndex: 0, allottedMinutes: 60, status: 'DONE', completedAt: iso(now()), extraLoads: 0, expiry: { shouldAddExtraLoad: false, isExpired: false, isOverdue: false, extraLoadCap: 1, periodsElapsed: 0, remainingMinutesInPeriod: 0 } } as any,
        { topicId: '2', title: 't2', description: null, orderIndex: 1, allottedMinutes: 60, status: 'PENDING', completedAt: null, extraLoads: 1, expiry: { shouldAddExtraLoad: false, isExpired: true, isOverdue: false, extraLoadCap: 1, periodsElapsed: 1, remainingMinutesInPeriod: 0 } } as any,
      ]);
      expect(summary.completedTopics).toBe(1);
      expect(summary.totalTopics).toBe(2);
      expect(summary.percentage).toBe(50);
      expect(summary.totalExtraLoads).toBe(1); // tracked, not counted
    });
  });

  // =========================================================
  // 5. ROLE PERMISSIONS
  // =========================================================
  describe('Role permissions & scoping', () => {
    it('lets a faculty member read only their own load', async () => {
      const me = await request(app)
        .get('/api/v1/syllabus/me')
        .set('Authorization', `Bearer ${facultyAToken}`);
      expect(me.status).toBe(200);
      // Only faculty A's topics are returned — never faculty B's.
      const titles = me.body.data.topics.map((t: any) => t.title);
      expect(titles.some((t: string) => t.startsWith('Unit A'))).toBe(true);
      expect(titles.some((t: string) => t.startsWith('Unit B'))).toBe(false);
    });

    it('denies a faculty member the institution-wide overview', async () => {
      const res = await request(app)
        .get('/api/v1/syllabus')
        .set('Authorization', `Bearer ${facultyAToken}`);
      expect(res.status).toBe(403);
    });

    it('denies a faculty member reading another faculty member\'s detail', async () => {
      const res = await request(app)
        .get(`/api/v1/syllabus/faculty/${facultyBId}`)
        .set('Authorization', `Bearer ${facultyAToken}`);
      expect(res.status).toBe(403);
    });

    it('denies a faculty member editing another faculty member\'s load', async () => {
      const res = await request(app)
        .put(`/api/v1/syllabus/faculty/${facultyBId}/load`)
        .set('Authorization', `Bearer ${facultyAToken}`)
        .send({ topics: [{ title: 'Hijacked', allottedMinutes: 10 }] });
      expect(res.status).toBe(403);

      // Confirm faculty B's load is untouched.
      const meB = await request(app)
        .get('/api/v1/syllabus/me')
        .set('Authorization', `Bearer ${facultyBToken}`);
      expect(meB.body.data.topics.length).toBe(1);
      expect(meB.body.data.topics[0].title).toContain('Recursion');
    });

    it('denies a faculty member marking another faculty member\'s topic done', async () => {
      // Faculty A attempts to complete faculty B's topic via the /me endpoint.
      const bMe = await request(app)
        .get('/api/v1/syllabus/me')
        .set('Authorization', `Bearer ${facultyBToken}`);
      const bTopicId = bMe.body.data.topics[0].topicId;

      const res = await request(app)
        .post(`/api/v1/syllabus/me/topics/${bTopicId}/done`)
        .set('Authorization', `Bearer ${facultyAToken}`);
      expect(res.status).toBe(403);

      // Faculty B's topic must remain pending.
      const bMe2 = await request(app)
        .get('/api/v1/syllabus/me')
        .set('Authorization', `Bearer ${facultyBToken}`);
      expect(bMe2.body.data.topics[0].status).toBe('PENDING');
    });

    it('lets the Superadmin see every faculty member\'s progress & extra loads', async () => {
      const res = await request(app)
        .get('/api/v1/syllabus')
        .set('Authorization', `Bearer ${superadminToken}`);
      expect(res.status).toBe(200);
      const ids = res.body.data.faculty.map((f: any) => f.facultyId);
      expect(ids).toContain(facultyAId);
      expect(ids).toContain(facultyBId);
      const facA = res.body.data.faculty.find((f: any) => f.facultyId === facultyAId);
      expect(facA.summary.percentage).toBe(100);
      expect(facA.summary.totalExtraLoads).toBe(1);
    });

    it('lets the Superadmin edit a faculty member\'s academic load', async () => {
      const res = await request(app)
        .put(`/api/v1/syllabus/faculty/${facultyBId}/load`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          topics: [
            { title: 'B-New — Stacks', allottedMinutes: 45, orderIndex: 0 },
            { title: 'B-New — Queues', allottedMinutes: 45, orderIndex: 1 },
          ],
        });
      expect(res.status).toBe(200);
      expect(res.body.data.summary.totalTopics).toBe(2);
      expect(res.body.data.topics[0].title).toContain('Stacks');
    });

    it('writes an audit trail when Superadmin overrides a completion record', async () => {
      // Use faculty B's first topic (currently pending) as the override target.
      const before = await request(app)
        .get(`/api/v1/syllabus/faculty/${facultyBId}`)
        .set('Authorization', `Bearer ${superadminToken}`);
      const target = before.body.data.topics[0];
      expect(target.status).toBe('PENDING');

      const res = await request(app)
        .post(`/api/v1/syllabus/faculty/${facultyBId}/topics/${target.topicId}/override`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ status: 'DONE', note: 'Verified via review meeting' });
      expect(res.status).toBe(200);

      // The audit row must exist with who / what / when / old / new.
      const audit = await prisma.syllabusCompletionAudit.findFirst({
        where: { topicId: target.topicId, action: 'SUPERADMIN_OVERRIDE' },
        orderBy: { createdAt: 'desc' },
      });
      expect(audit).not.toBeNull();
      expect(audit!.actorUserId).toBe(superadminUserId);
      expect(audit!.actorEmail).not.toBeNull();
      const oldVal = JSON.parse(audit!.oldValue!);
      const newVal = JSON.parse(audit!.newValue!);
      expect(oldVal.status).toBe('PENDING');
      expect(newVal.status).toBe('DONE');
      expect(newVal.completedByUserId).toBe(superadminUserId);
      expect(audit!.createdAt).toBeTruthy(); // "when"

      // The override took effect.
      const after = await request(app)
        .get(`/api/v1/syllabus/faculty/${facultyBId}`)
        .set('Authorization', `Bearer ${superadminToken}`);
      const afterTopic = after.body.data.topics.find((t: any) => t.topicId === target.topicId);
      expect(afterTopic.status).toBe('DONE');
    });

    it('denies a faculty member the Superadmin override endpoint', async () => {
      const res = await request(app)
        .post(`/api/v1/syllabus/faculty/${facultyAId}/topics/${topicA1Id}/override`)
        .set('Authorization', `Bearer ${facultyAToken}`)
        .send({ status: 'PENDING' });
      expect(res.status).toBe(403);
    });
  });

  // =========================================================
  // 6. LOGIN & CREDENTIAL SECURITY
  // =========================================================
  describe('Login & password storage', () => {
    it('succeeds with correct email + password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: facultyAEmail, password: facultyAPassword });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.role).toBe('FACULTY');
    });

    it('succeeds when logging in with the faculty ID (employeeId)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ userId: facultyAEmployeeId, password: facultyAPassword });
      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.role).toBe('FACULTY');
    });

    it('fails with an incorrect password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: facultyAEmail, password: 'TotallyWrongPassword!9' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('fails for a non-existent account without leaking which part was wrong', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'no.such.faculty@zeal.edu.in', password: 'Anything@1' });
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid email or password.');
    });

    it('stores the password hashed, never in plaintext, and never returns it', async () => {
      const user = await prisma.user.findUnique({ where: { email: facultyAEmail } });
      expect(user).not.toBeNull();
      expect(user!.passwordHash).not.toBe(facultyAPassword);
      expect(user!.passwordHash.length).toBeGreaterThan(20);
      expect(await bcrypt.compare(facultyAPassword, user!.passwordHash)).toBe(true);

      // The provisioning / own-load responses must not leak the hash.
      const me = await request(app)
        .get('/api/v1/syllabus/me')
        .set('Authorization', `Bearer ${facultyAToken}`);
      expect(JSON.stringify(me.body)).not.toContain('passwordHash');
    });

    it('lets the Superadmin reset a faculty password, after which the new one works and the old one does not', async () => {
      const reset = await request(app)
        .put(`/api/v1/syllabus/faculty/${facultyAId}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ password: 'NewReset@2026' });
      expect(reset.status).toBe(200);
      expect(reset.body.data.passwordReset).toBe(true);
      expect(JSON.stringify(reset.body)).not.toContain('NewReset@2026');

      const withNew = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: facultyAEmail, password: 'NewReset@2026' });
      expect(withNew.status).toBe(200);

      const withOld = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: facultyAEmail, password: facultyAPassword });
      expect(withOld.status).toBe(401);

      // Refresh the token used elsewhere in the suite for faculty A.
      const fresh = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: facultyAEmail, password: 'NewReset@2026' });
      facultyAToken = fresh.body.data.token;
    });
  });
});
