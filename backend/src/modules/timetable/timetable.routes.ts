import { Router } from 'express';
import { TimetableController } from './timetable.controller';
import { authenticateJWT } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';
import { logAudit } from '../../middleware/audit';

const router = Router();

// All authenticated users may read timetable
router.get('/', authenticateJWT, TimetableController.listSlots);
router.get('/department/:departmentId', authenticateJWT, TimetableController.getDepartmentTimetable);
router.get('/:id', authenticateJWT, TimetableController.getSlotById);

// Only admin-level roles may mutate
router.post(
  '/',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT'),
  logAudit('TIMETABLE', 'CREATE_SLOT'),
  TimetableController.createSlot
);

router.patch(
  '/:id',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT'),
  logAudit('TIMETABLE', 'UPDATE_SLOT'),
  TimetableController.updateSlot
);

router.delete(
  '/:id',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT'),
  logAudit('TIMETABLE', 'DELETE_SLOT'),
  TimetableController.deleteSlot
);

export default router;
