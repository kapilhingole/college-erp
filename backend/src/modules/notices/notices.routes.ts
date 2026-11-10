import { Router } from 'express';
import { NoticesController } from './notices.controller';
import { authenticateJWT } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';
import { logAudit } from '../../middleware/audit';

const router = Router();

router.get('/', authenticateJWT, NoticesController.listNotices);

router.post(
  '/',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'FACULTY'),
  logAudit('NOTICES', 'CREATE'),
  NoticesController.createNotice
);

router.delete(
  '/:id',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT'),
  logAudit('NOTICES', 'DELETE'),
  NoticesController.deleteNotice
);

export default router;
