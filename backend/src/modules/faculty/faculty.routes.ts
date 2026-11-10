import { Router } from 'express';
import { FacultyController } from './faculty.controller';
import { authenticateJWT } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';
import { logAudit } from '../../middleware/audit';

const router = Router();

router.get('/', authenticateJWT, FacultyController.listFaculty);
router.get('/:id', authenticateJWT, FacultyController.getFacultyById);

router.post(
  '/',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT'),
  logAudit('FACULTY', 'ONBOARD'),
  FacultyController.onboardFaculty
);
router.post(
  '/assign-subject',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT'),
  logAudit('FACULTY', 'ASSIGN_SUBJECT'),
  FacultyController.assignSubject
);

export default router;
