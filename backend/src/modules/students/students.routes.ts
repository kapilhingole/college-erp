import { Router } from 'express';
import { StudentsController } from './students.controller';
import { authenticateJWT } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';
import { logAudit } from '../../middleware/audit';

const router = Router();

// Students, Faculty, Admin can view students (with scoped permissions)
router.get('/', authenticateJWT, requireRoles('SUPER_ADMIN', 'ADMIN', 'FACULTY', 'MANAGEMENT'), StudentsController.listStudents);

// Bulk Import & Template (placed before /:id)
router.get('/template', authenticateJWT, StudentsController.downloadTemplate);
router.post(
  '/bulk-import',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT'),
  logAudit('STUDENTS', 'BULK_IMPORT'),
  StudentsController.bulkImportStudents
);

router.get('/:id', authenticateJWT, StudentsController.getStudentById);

// Admin-only operations
router.post(
  '/',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN'),
  logAudit('STUDENTS', 'ADMISSION'),
  StudentsController.admitStudent
);
router.put(
  '/:id',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN'),
  logAudit('STUDENTS', 'UPDATE'),
  StudentsController.updateStudent
);
router.post(
  '/promote',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN'),
  logAudit('STUDENTS', 'PROMOTION'),
  StudentsController.promoteStudents
);
router.post(
  '/allocate-section',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN'),
  logAudit('STUDENTS', 'SECTION_ALLOCATION'),
  StudentsController.allocateSection
);

export default router;
