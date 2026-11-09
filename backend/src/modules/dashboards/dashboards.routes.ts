import { Router } from 'express';
import { DashboardsController } from './dashboards.controller';
import { authenticateJWT } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';

const router = Router();

router.get('/student', authenticateJWT, requireRoles('STUDENT'), DashboardsController.getStudentDashboard);
router.get('/faculty', authenticateJWT, requireRoles('FACULTY'), DashboardsController.getFacultyDashboard);
router.get('/admin', authenticateJWT, requireRoles('SUPER_ADMIN', 'ADMIN'), DashboardsController.getAdminDashboard);

export default router;
