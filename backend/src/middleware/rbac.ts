import { Request, Response, NextFunction } from 'express';
import { AuthUser, Role } from './auth';

export { Role };

export const isManagement = (role: string): boolean => {
  return role === 'MANAGEMENT' || role === 'SUPER_ADMIN' || role === 'ADMIN';
};

export const requireRoles = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required before permission check.',
      });
      return;
    }

    const userRole = req.user.role;
    const allowsManagement = allowedRoles.some((r) => isManagement(r));
    const userIsManagement = isManagement(userRole);

    const hasAccess =
      allowedRoles.includes(userRole) ||
      (allowsManagement && userIsManagement);

    if (!hasAccess) {
      res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to roles [${allowedRoles.join(', ')}]. Your current role is ${userRole}.`,
      });
      return;
    }

    next();
  };
};

/**
 * Checks that the user belongs to the target department unless they are Management / Admin.
 */
export const requireDepartmentScope = (getDepartmentId: (req: Request) => string | undefined) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    // Management roles have institution-wide scope
    if (isManagement(req.user.role)) {
      return next();
    }

    const targetDeptId = getDepartmentId(req);
    if (targetDeptId && req.user.departmentId && req.user.departmentId !== targetDeptId) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have authorization for this department.',
      });
      return;
    }

    next();
  };
};
