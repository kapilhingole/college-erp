import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config';
import bcrypt from 'bcryptjs';

describe('Role-Based Auth & Management Provisioning Verification', () => {
  let managementToken: string;
  let facultyToken: string;
  let studentToken: string;

  beforeAll(async () => {
    // 1. Ensure Management account exists
    let mgmtUser = await prisma.user.findUnique({ where: { email: 'test.mgmt@zeal.edu.in' } });
    if (!mgmtUser) {
      const hash = await bcrypt.hash('Management@123', 12);
      mgmtUser = await prisma.user.create({
        data: {
          email: 'test.mgmt@zeal.edu.in',
          passwordHash: hash,
          role: 'MANAGEMENT',
          status: 'ACTIVE',
          managementProfile: {
            create: {
              employeeId: 'MGMT-TEST-001',
              firstName: 'Test',
              lastName: 'Registrar',
              email: 'test.mgmt@zeal.edu.in',
              designation: 'Registrar',
              office: 'Central Administration',
            },
          },
        },
      });
    }

    // Login as Management
    const mgmtRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test.mgmt@zeal.edu.in', password: 'Management@123' });
    managementToken = mgmtRes.body.data.token;

    // 2. Ensure Disabled account exists
    const disabledUser = await prisma.user.findUnique({ where: { email: 'test.disabled@zeal.edu.in' } });
    if (!disabledUser) {
      const hash = await bcrypt.hash('Disabled@123', 12);
      await prisma.user.create({
        data: {
          email: 'test.disabled@zeal.edu.in',
          passwordHash: hash,
          role: 'STUDENT',
          status: 'DISABLED',
        },
      });
    }
  });

  describe('1. Provisioning Flow (Management Driven)', () => {
    it('allows Management to provision a Faculty account with tied profile', async () => {
      const email = `fac.prov.${Date.now()}@zeal.edu.in`;
      const res = await request(app)
        .post('/api/v1/auth/provision')
        .set('Authorization', `Bearer ${managementToken}`)
        .send({
          email,
          password: 'InitialFaculty@2026',
          role: 'Faculty',
          profile: {
            firstName: 'Aditi',
            lastName: 'Joshi',
            employeeId: `FAC-TEST-${Date.now().toString().slice(-4)}`,
            designation: 'Assistant Professor',
            qualification: 'Ph.D in AI',
            departmentCode: 'CSE',
            phone: '9822001122',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(email);
      expect(res.body.data.user.role).toBe('FACULTY');
      expect(res.body.data.profile.firstName).toBe('Aditi');
      expect(res.body.data.profile.designation).toBe('Assistant Professor');

      // Verify password is NOT returned and is stored hashed
      expect(res.body.data.user.passwordHash).toBeUndefined();
      const inDb = await prisma.user.findUnique({ where: { email } });
      expect(inDb?.passwordHash).not.toBe('InitialFaculty@2026');
      expect(await bcrypt.compare('InitialFaculty@2026', inDb!.passwordHash)).toBe(true);
    });

    it('allows Management to provision a Student account with tied profile', async () => {
      const email = `stu.prov.${Date.now()}@zeal.edu.in`;
      const res = await request(app)
        .post('/api/v1/auth/provision')
        .set('Authorization', `Bearer ${managementToken}`)
        .send({
          email,
          password: 'InitialStudent@2026',
          role: 'Student',
          profile: {
            firstName: 'Nikhil',
            lastName: 'Shinde',
            rollNumber: `ZCOER-CSE-${Date.now().toString().slice(-3)}`,
            enrollmentNumber: `10322${Date.now().toString().slice(-5)}`,
            departmentCode: 'CSE',
            currentSemester: 1,
            phone: '9822003344',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('STUDENT');
      expect(res.body.data.profile.firstName).toBe('Nikhil');
      expect(res.body.data.profile.currentSemester).toBe(1);

      // Save token for student tests
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: 'InitialStudent@2026' });
      studentToken = loginRes.body.data.token;
    });

    it('allows Management to provision another Management account', async () => {
      const email = `mgmt.prov.${Date.now()}@zeal.edu.in`;
      const res = await request(app)
        .post('/api/v1/auth/provision')
        .set('Authorization', `Bearer ${managementToken}`)
        .send({
          email,
          password: 'InitialMgmt@2026',
          role: 'Management',
          profile: {
            firstName: 'Kavita',
            lastName: 'Patil',
            employeeId: `MGMT-${Date.now().toString().slice(-4)}`,
            designation: 'Dean of Student Affairs',
            office: 'Directorate Office',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe('MANAGEMENT');
      expect(res.body.data.profile.office).toBe('Directorate Office');
    });

    it('rejects provisioning when attempted by a Student (server-side RBAC)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/provision')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          email: 'unauthorized@zeal.edu.in',
          password: 'Password123!',
          role: 'Student',
          profile: { firstName: 'Hacker', lastName: 'User' },
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('rejects duplicate email provisioning with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/auth/provision')
        .set('Authorization', `Bearer ${managementToken}`)
        .send({
          email: 'test.mgmt@zeal.edu.in', // Already exists
          password: 'DuplicatePass@123',
          role: 'Management',
          profile: { firstName: 'Dup', lastName: 'User' },
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already been provisioned');
    });
  });

  describe('2. Authentication Flow & Security Error Handling', () => {
    it('authenticates valid email and password, issuing JWT carrying the role', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test.mgmt@zeal.edu.in',
          password: 'Management@123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.role).toBe('MANAGEMENT');
      expect(res.body.data.profile.designation).toBe('Registrar');
    });

    it('handles unprovisioned user returning generic error without revealing email existence', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent.user.999@zeal.edu.in',
          password: 'AnyPassword@123',
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid email or password.');
    });

    it('handles wrong password returning the identical generic error message', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test.mgmt@zeal.edu.in',
          password: 'CompletelyWrongPassword!123',
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid email or password.');
    });

    it('handles disabled account with distinct 403 error', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test.disabled@zeal.edu.in',
          password: 'Disabled@123',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Account is disabled. Please contact the management team.');
    });
  });

  describe('3. Profile Retrieval Endpoint & Role Scoping', () => {
    it('retrieves student profile immediately after login for student role', async () => {
      const res = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('STUDENT');
      expect(res.body.data.profile).toBeDefined();
      expect(res.body.data.profile.firstName).toBe('Nikhil');
      expect(res.body.data.profile.department).toBeDefined();
    });

    it('retrieves management profile immediately after login for management role', async () => {
      const res = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${managementToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('MANAGEMENT');
      expect(res.body.data.profile.designation).toBe('Registrar');
      expect(res.body.data.profile.office).toBe('Central Administration');
    });

    it('rejects profile retrieval when unauthenticated', async () => {
      const res = await request(app).get('/api/v1/auth/profile');
      expect(res.status).toBe(401);
    });
  });
});

