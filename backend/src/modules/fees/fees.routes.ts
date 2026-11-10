import { Router } from 'express';
import { FeesController } from './fees.controller';
import { authenticateJWT } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';
import { logAudit } from '../../middleware/audit';

const router = Router();

// Student can view their ledgers, Admin can view all
router.get('/ledgers', authenticateJWT, FeesController.listStudentLedgers);
router.get('/structures', authenticateJWT, FeesController.listStructures);

// Admin and Management fee operations
router.post(
  '/structures',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT'),
  logAudit('FEES', 'CREATE_STRUCTURE'),
  FeesController.createStructure
);
router.post(
  '/generate-invoices',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT'),
  logAudit('FEES', 'GENERATE_INVOICES'),
  FeesController.generateInvoices
);
router.post(
  '/pay',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT'),
  logAudit('FEES', 'RECORD_PAYMENT'),
  FeesController.recordPayment
);

export default router;
