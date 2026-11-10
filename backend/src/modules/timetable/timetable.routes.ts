import { Router } from 'express';
import { TimetableController } from './timetable.controller';
import { authenticateJWT } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';
import { logAudit } from '../../middleware/audit';

const router = Router();

router.get('/', authenticateJWT, TimetableController.listSlots);

router.post(
  '/',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT'),
  logAudit('TIMETABLE', 'CREATE_SLOT'),
  TimetableController.createSlot
);

router.delete(
  '/:id',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT'),
  logAudit('TIMETABLE', 'DELETE_SLOT'),
  TimetableController.deleteSlot
);

export default router;
