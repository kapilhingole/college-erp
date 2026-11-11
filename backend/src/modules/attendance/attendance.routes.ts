import { Router } from 'express';
import { AttendanceController } from './attendance.controller';
import { authenticateJWT } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';
import { logAudit } from '../../middleware/audit';

const router = Router();

// Student routes (Strictly Read-Only for students)
router.get('/my-attendance', authenticateJWT, AttendanceController.getMyAttendance);
router.get('/student/:studentId', authenticateJWT, AttendanceController.getStudentAttendance);
router.post('/leave/apply', authenticateJWT, logAudit('ATTENDANCE', 'APPLY_LEAVE'), AttendanceController.applyLeave);

// Faculty, Management & Admin routes
router.post(
  '/sessions',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'FACULTY'),
  logAudit('ATTENDANCE', 'CREATE_SESSION'),
  AttendanceController.createSession
);
router.post(
  '/mark',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'FACULTY'),
  logAudit('ATTENDANCE', 'MARK_BULK'),
  AttendanceController.markBulkAttendance
);
router.get(
  '/defaulters',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'FACULTY'),
  AttendanceController.getDefaulters
);
router.patch(
  '/leave/:id/review',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'FACULTY'),
  logAudit('ATTENDANCE', 'REVIEW_LEAVE'),
  AttendanceController.reviewLeave
);

export default router;
