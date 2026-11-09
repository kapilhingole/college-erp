import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config';

export const logAudit = (module: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Capture the original end response to log after successful completion
    const originalJson = res.json.bind(res);

    res.json = function (body: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Fire and forget audit log entry
        prisma.auditLog
          .create({
            data: {
              userId: req.user?.id,
              userEmail: req.user?.email || 'anonymous',
              action,
              module,
              details: JSON.stringify({
                path: req.originalUrl,
                method: req.method,
                params: req.params,
                query: req.query,
                bodySummary: req.body ? Object.keys(req.body) : [],
              }),
              ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
            },
          })
          .catch((err) => console.error('[AuditLog Error]:', err));
      }
      return originalJson(body);
    };

    next();
  };
};
