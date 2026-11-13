import { Router } from 'express';
import { AttendanceController } from './attendance.controller';
import { authenticateJWT } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';
import { logAudit } from '../../middleware/audit';

const router = Router();

// Student: personal attendance dashboard (timetable-scoped)
router.get('/my-attendance', authenticateJWT, AttendanceController.getMyAttendance);

// Student: attendance for a specific student (scoped server-side)
router.get('/student/:studentId', authenticateJWT, AttendanceController.getStudentAttendance);

// Faculty: summary of their lecture sessions and attendance marked
router.get('/faculty/:facultyId', authenticateJWT, AttendanceController.getFacultyAttendanceSummary);

// Defaulter list — admin/faculty
router.get(
  '/defaulters',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'FACULTY'),
  AttendanceController.getDefaulters
);

// Superadmin: all records with filters
router.get(
  '/superadmin/all',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT'),
  AttendanceController.getAllAttendance
);

// Faculty: create a lecture session
router.post(
  '/sessions',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'FACULTY'),
  logAudit('ATTENDANCE', 'CREATE_SESSION'),
  AttendanceController.createSession
);

// Faculty: bulk mark attendance
router.post(
  '/mark',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'FACULTY'),
  logAudit('ATTENDANCE', 'MARK_BULK'),
  AttendanceController.markBulkAttendance
);

// Student: apply for leave
router.post('/leave', authenticateJWT, AttendanceController.applyLeave);

// Faculty/Admin: approve or reject leave
router.patch(
  '/leave/:id',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'FACULTY'),
  AttendanceController.reviewLeave
);

export default router;
