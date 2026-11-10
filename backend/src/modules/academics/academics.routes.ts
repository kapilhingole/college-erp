import { Router } from 'express';
import { AcademicsController } from './academics.controller';
import { authenticateJWT } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';
import { logAudit } from '../../middleware/audit';

const router = Router();

// Subject routes
router.get('/subjects', authenticateJWT, AcademicsController.listSubjects);
router.post(
  '/subjects',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT'),
  logAudit('ACADEMICS', 'CREATE_SUBJECT'),
  AcademicsController.createSubject
);

// Exam cycle and schedule routes
router.get('/exams', authenticateJWT, AcademicsController.listExams);
router.post(
  '/exams',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT'),
  logAudit('ACADEMICS', 'CREATE_EXAM'),
  AcademicsController.createExam
);
router.post(
  '/exam-schedules',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT'),
  logAudit('ACADEMICS', 'CREATE_EXAM_SCHEDULE'),
  AcademicsController.createExamSchedule
);

// Marks entry & grading (Faculty, Admins and Management)
router.post(
  '/marks',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'FACULTY'),
  logAudit('ACADEMICS', 'SUBMIT_MARKS'),
  AcademicsController.submitMarks
);

// Publish results (Super Admin, Admin & Management)
router.post(
  '/publish-results',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT'),
  logAudit('ACADEMICS', 'PUBLISH_RESULTS'),
  AcademicsController.publishSemesterResults
);

// Student report card
router.get('/report-card/:studentId/:semester', authenticateJWT, AcademicsController.getStudentReportCard);

export default router;
