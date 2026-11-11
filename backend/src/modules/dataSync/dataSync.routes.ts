import { Router } from 'express';
import { DataSyncController } from './dataSync.controller';
import { authenticateJWT } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';
import { logAudit } from '../../middleware/audit';

const router = Router();

// Universal Ingestion & Synchronization (Restricted to SUPER_ADMIN & MANAGEMENT)
router.post(
  '/preview',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'MANAGEMENT', 'ADMIN'),
  DataSyncController.preview
);

router.post(
  '/process',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'MANAGEMENT', 'ADMIN'),
  logAudit('DATA_SYNC', 'PROCESS_FILE'),
  DataSyncController.process
);

router.get(
  '/template/:entity',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'MANAGEMENT', 'ADMIN'),
  DataSyncController.downloadTemplate
);

export default router;
