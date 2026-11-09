import { Router } from 'express';
import { ReportsController } from './reports.controller';
import { authenticateJWT } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';
import { logAudit } from '../../middleware/audit';

const router = Router();

// Excel Export routes (Faculty & Admin)
router.get(
  '/attendance-defaulters/excel',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN', 'FACULTY'),
  logAudit('REPORTS', 'EXPORT_ATTENDANCE_EXCEL'),
  ReportsController.exportAttendanceDefaultersExcel
);

router.get(
  '/fee-defaulters/excel',
  authenticateJWT,
  requireRoles('SUPER_ADMIN', 'ADMIN'),
  logAudit('REPORTS', 'EXPORT_FEE_EXCEL'),
  ReportsController.exportFeeDefaultersExcel
);

// PDF Export routes
router.get(
  '/report-card/:studentId/:semester/pdf',
  authenticateJWT,
  logAudit('REPORTS', 'EXPORT_REPORT_CARD_PDF'),
  ReportsController.generateReportCardPdf
);

router.get(
  '/receipt/:paymentId/pdf',
  authenticateJWT,
  logAudit('REPORTS', 'EXPORT_RECEIPT_PDF'),
  ReportsController.generateFeeReceiptPdf
);

export default router;
