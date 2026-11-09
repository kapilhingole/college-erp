import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticateJWT } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';
import { authLimiter } from '../../middleware/rateLimiter';
import { logAudit } from '../../middleware/audit';

const router = Router();

// 1. Login flow (email & password only)
router.post('/login', authLimiter, logAudit('AUTH', 'LOGIN'), AuthController.login);

// 2. Profile retrieval with server-enforced role verification
router.get('/profile', authenticateJWT, AuthController.getProfile);
router.get('/me', authenticateJWT, AuthController.me);

// 3. User & Profile provisioning by Management (Strictly restricted to MANAGEMENT role)
router.post(
  '/provision',
  authenticateJWT,
  requireRoles('MANAGEMENT', 'SUPER_ADMIN', 'ADMIN'),
  logAudit('AUTH', 'PROVISION_USER'),
  AuthController.provisionUser
);

// 4. Password change
router.post('/change-password', authenticateJWT, logAudit('AUTH', 'CHANGE_PASSWORD'), AuthController.changePassword);

export default router;
