import { Router } from 'express';
import { DepartmentsController } from './departments.controller';
import { authenticateJWT } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';
import { logAudit } from '../../middleware/audit';

const router = Router();

// Everyone authenticated can view department hierarchy
router.get('/', authenticateJWT, DepartmentsController.listDepartments);

// Only Super Admin & Admin can modify academic hierarchy
router.post(
  '/',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN'),
  logAudit('DEPARTMENT', 'CREATE'),
  DepartmentsController.createDepartment
);
router.put(
  '/:id',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN'),
  logAudit('DEPARTMENT', 'UPDATE'),
  DepartmentsController.updateDepartment
);
router.delete(
  '/:id',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN'),
  logAudit('DEPARTMENT', 'DELETE'),
  DepartmentsController.deleteDepartment
);

router.post(
  '/programs',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN'),
  logAudit('PROGRAM', 'CREATE'),
  DepartmentsController.createProgram
);
router.post(
  '/batches',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN'),
  logAudit('BATCH', 'CREATE'),
  DepartmentsController.createBatch
);
router.post(
  '/sections',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN'),
  logAudit('SECTION', 'CREATE'),
  DepartmentsController.createSection
);

export default router;
