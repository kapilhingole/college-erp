import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config';
import { AppError } from '../../middleware/errorHandler';

const noticeSchema = z.object({
  title: z.string().min(3),
  content: z.string().min(10),
  targetRole: z.enum(['ALL', 'STUDENT', 'FACULTY', 'ADMIN']).default('ALL'),
  targetDepartmentId: z.string().uuid().optional().nullable(),
  priority: z.enum(['NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  attachmentUrl: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
});

export class NoticesController {
  // List notices filtered by user role and department
  static async listNotices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { priority, departmentId } = req.query;
      const user = req.user;

      const where: any = { isPublished: true };

      if (priority) where.priority = String(priority);

      // Audience targeting logic:
      // If student: see notices for ALL or STUDENT, and where targetDepartmentId is null or matches their department
      // If faculty: see notices for ALL or FACULTY, and where targetDepartmentId is null or matches their department
      // If admin/super_admin: see all
      if (user?.role === 'STUDENT') {
        where.targetRole = { in: ['ALL', 'STUDENT'] };
        if (user.departmentId) {
          where.OR = [
            { targetDepartmentId: null },
            { targetDepartmentId: user.departmentId },
          ];
        } else {
          where.targetDepartmentId = null;
        }
      } else if (user?.role === 'FACULTY') {
        where.targetRole = { in: ['ALL', 'FACULTY'] };
        if (user.departmentId) {
          where.OR = [
            { targetDepartmentId: null },
            { targetDepartmentId: user.departmentId },
          ];
        } else {
          where.targetDepartmentId = null;
        }
      } else if (departmentId) {
        where.targetDepartmentId = String(departmentId);
      }

      const notices = await prisma.notice.findMany({
        where,
        include: {
          author: { select: { id: true, email: true, role: true } },
        },
        orderBy: [{ priority: 'desc' }, { publishedAt: 'desc' }],
      });

      res.json({ success: true, count: notices.length, data: notices });
    } catch (error) {
      next(error);
    }
  }

  // Create notice (Faculty & Admins)
  static async createNotice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);
      const data = noticeSchema.parse(req.body);

      const notice = await prisma.notice.create({
        data: {
          title: data.title,
          content: data.content,
          authorId: req.user.id,
          targetRole: data.targetRole,
          targetDepartmentId: data.targetDepartmentId || null,
          priority: data.priority,
          attachmentUrl: data.attachmentUrl || null,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
          isPublished: true,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Notice published successfully.',
        data: notice,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteNotice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await prisma.notice.delete({ where: { id } });
      res.json({ success: true, message: 'Notice deleted successfully.' });
    } catch (error) {
      next(error);
    }
  }
}
