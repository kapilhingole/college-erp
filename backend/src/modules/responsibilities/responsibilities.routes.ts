import { Router } from 'express';
import { ResponsibilitiesController } from './responsibilities.controller';
import { ReportsController } from './reports.controller';
import { authenticateJWT } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';

const router = Router();

// All responsibility routes require authentication
router.use(authenticateJWT);

// Monthly Submissions endpoints (Ingested CSV actual data & manual entry insertion)
router.get('/submissions', requireRoles('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'FACULTY'), ReportsController.listSubmissions);
router.get('/submissions/by-report/:reportNo', requireRoles('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'FACULTY'), ReportsController.getSubmissionByReportNo);
router.get('/submissions/:id', requireRoles('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'FACULTY'), ReportsController.getSubmissionById);
router.post('/submissions/:id/entries', requireRoles('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'FACULTY'), ReportsController.addEntry);
router.delete('/submissions/:id/entries/:entryId', requireRoles('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT'), ReportsController.deleteEntry);

// List & Stats (Management, SuperAdmin, Faculty can inspect)
router.get('/', requireRoles('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'FACULTY'), ResponsibilitiesController.list);
router.get('/stats', requireRoles('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT'), ResponsibilitiesController.getStats);
router.get('/export', requireRoles('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT'), ResponsibilitiesController.exportCsv);

// SuperAdmin / Management configuration and assignments
router.post('/', requireRoles('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT'), ResponsibilitiesController.create);
router.put('/:id', requireRoles('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT'), ResponsibilitiesController.update);
router.post('/bulk-import', requireRoles('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT'), ResponsibilitiesController.bulkImport);

export default router;

