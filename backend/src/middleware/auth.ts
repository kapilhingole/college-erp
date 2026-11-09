import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CONFIG, prisma } from '../config';

export type Role = 'MANAGEMENT' | 'FACULTY' | 'STUDENT' | 'SUPER_ADMIN' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  departmentId?: string;
  studentId?: string;
  facultyId?: string;
  managementId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authenticateJWT = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Access denied: No authentication token provided.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, CONFIG.JWT_SECRET) as {
      id: string;
      email: string;
      role: Role;
    };

    // Verify user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        studentProfile: { select: { id: true, departmentId: true, sectionId: true } },
        facultyProfile: { select: { id: true, departmentId: true } },
        managementProfile: { select: { id: true, office: true } },
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      res.status(403).json({
        success: false,
        message: 'Account is deactivated, suspended, or does not exist.',
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role as Role,
      departmentId: user.studentProfile?.departmentId || user.facultyProfile?.departmentId,
      studentId: user.studentProfile?.id,
      facultyId: user.facultyProfile?.id,
      managementId: user.managementProfile?.id,
    };

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid, malformed, or expired authentication token.',
    });
    return;
  }
};
