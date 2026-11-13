import { Router } from 'express';
import { MarksController } from './marks.controller';
import { authenticateJWT } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';
import { logAudit } from '../../middleware/audit';

const router = Router();

// Faculty enters marks (also allowed for admin roles)
router.post(
  '/bulk',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'FACULTY'),
  logAudit('MARKS', 'ENTER_BULK_MARKS'),
  MarksController.enterBulkMarks
);

// Student views their own marks; admin sees any student's marks
router.get(
  '/student/:studentId',
  authenticateJWT,
  MarksController.getStudentMarks
);

// View all marks for an exam schedule (faculty scoped, admin sees all)
router.get(
  '/exam-schedule/:examScheduleId',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'FACULTY'),
  MarksController.getMarksByExamSchedule
);

// Superadmin aggregation with filters
router.get(
  '/superadmin/all',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT'),
  MarksController.getAllMarks
);

export default router;
