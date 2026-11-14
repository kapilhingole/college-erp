import { Router } from 'express';
import { SyllabusController } from './syllabus.controller';
import { authenticateJWT } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';
import { logAudit } from '../../middleware/audit';

/**
 * Faculty Academic Load & Syllabus Progress Tracking
 *
 * Authentication is the existing JWT scheme (POST /api/v1/auth/login).
 * Faculty log in with their unique faculty ID (employeeId) + password;
 * Superadmin logs in with their management credentials. Both receive a
 * bearer token that the middleware below validates.
 *
 * NOTE on RBAC: per the platform convention, requireRoles('SUPER_ADMIN')
 * admits the institution's management roles. This module names Superadmin
 * and Faculty as its two roles; tests exercise exactly those two.
 */
const router = Router();

// ── Faculty: own syllabus load (FACULTY only) ──
router.get('/me', authenticateJWT, requireRoles('FACULTY'), SyllabusController.getMyLoad);
router.post(
  '/me/topics/:topicId/done',
  authenticateJWT,
  requireRoles('FACULTY'),
  logAudit('SYLLABUS', 'MARK_TOPIC_DONE'),
  SyllabusController.markMyTopicDone
);

// ── Superadmin: oversight & management (SUPER_ADMIN only) ──
router.get('/', authenticateJWT, requireRoles('SUPER_ADMIN'), SyllabusController.listAllFacultyProgress);

router.get(
  '/faculty/:facultyId',
  authenticateJWT,
  requireRoles('SUPER_ADMIN'),
  SyllabusController.getFacultyProgress
);

router.post(
  '/faculty',
  authenticateJWT,
  requireRoles('SUPER_ADMIN'),
  logAudit('SYLLABUS', 'PROVISION_FACULTY'),
  SyllabusController.createFaculty
);

router.put(
  '/faculty/:id',
  authenticateJWT,
  requireRoles('SUPER_ADMIN'),
  logAudit('SYLLABUS', 'UPDATE_FACULTY'),
  SyllabusController.updateFaculty
);

router.put(
  '/faculty/:id/load',
  authenticateJWT,
  requireRoles('SUPER_ADMIN'),
  logAudit('SYLLABUS', 'SET_LOAD'),
  SyllabusController.setFacultyLoad
);

router.post(
  '/faculty/:id/topics/:topicId/override',
  authenticateJWT,
  requireRoles('SUPER_ADMIN'),
  logAudit('SYLLABUS', 'OVERRIDE_COMPLETION'),
  SyllabusController.overrideCompletion
);

export default router;
