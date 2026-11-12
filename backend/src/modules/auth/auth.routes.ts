import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticateJWT } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';
import { authLimiter } from '../../middleware/rateLimiter';
import { logAudit } from '../../middleware/audit';

const router = Router();

// Public — Login (strict rate-limited: 5 attempts / 15 min, up from 10 for extra safety)
router.post('/login', authLimiter, logAudit('AUTH', 'LOGIN'), AuthController.login);

// Public — Refresh access token using a valid refresh token
router.post('/refresh', AuthController.refresh);

// Protected — Logout: blacklists access token + revokes refresh token
router.post('/logout', authenticateJWT, logAudit('AUTH', 'LOGOUT'), AuthController.logout);

// Protected — Profile endpoints
router.get('/profile', authenticateJWT, AuthController.getProfile);
router.get('/me', authenticateJWT, AuthController.me);

// Protected — Change password (requires current password verification)
router.post('/change-password', authenticateJWT, logAudit('AUTH', 'CHANGE_PASSWORD'), AuthController.changePassword);

// Protected — Provision new user (Management/Admin only)
router.post(
  '/provision',
  authenticateJWT,
  requireRoles('MANAGEMENT', 'SUPER_ADMIN', 'ADMIN'),
  logAudit('AUTH', 'PROVISION_USER'),
  AuthController.provisionUser
);

export default router;
