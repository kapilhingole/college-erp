import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { CONFIG } from './config';
import { prisma } from './config';
import { apiLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';

// Import Module Routes
import authRoutes from './modules/auth/auth.routes';
import departmentRoutes from './modules/departments/departments.routes';
import studentRoutes from './modules/students/students.routes';
import facultyRoutes from './modules/faculty/faculty.routes';
import academicRoutes from './modules/academics/academics.routes';
import timetableRoutes from './modules/timetable/timetable.routes';
import attendanceRoutes from './modules/attendance/attendance.routes';
import feeRoutes from './modules/fees/fees.routes';
import libraryRoutes from './modules/library/library.routes';
import noticeRoutes from './modules/notices/notices.routes';
import dashboardRoutes from './modules/dashboards/dashboards.routes';
import reportRoutes from './modules/reports/reports.routes';
import responsibilityRoutes from './modules/responsibilities/responsibilities.routes';
import dataSyncRoutes from './modules/dataSync/dataSync.routes';

const app: Application = express();

// Prune expired token blacklist entries every hour to keep the table small
setInterval(async () => {
  try {
    await prisma.tokenBlacklist.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    await prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  } catch {
    // non-critical background job — silence errors
  }
}, 60 * 60 * 1000);

// Security Hardening
app.disable('x-powered-by');
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'same-origin' },
    contentSecurityPolicy: false,
    frameguard: { action: 'deny' },
    noSniff: true,
  })
);

// Serve frontend static files FIRST — before any CORS or API middleware.
// This ensures /assets/*.js, /assets/*.css etc. are never blocked by CORS.
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
}

// CORS applies only to /api routes — never to static assets or the SPA shell.
// In production the frontend is served from the same origin, so same-origin
// requests arrive with no Origin header and must always be allowed.
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

app.use(
  '/api',
  cors({
    origin: (origin, callback) => {
      // No origin = same-origin request (browser on same domain) — always allow
      if (!origin) return callback(null, true);
      // Explicitly listed origins — always allow
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Any *.onrender.com domain — allow (covers all Render preview/prod URLs)
      if (origin.endsWith('.onrender.com')) return callback(null, true);
      // Allow everything in non-production (local dev)
      if (CONFIG.NODE_ENV !== 'production') return callback(null, true);
      // Reject everything else
      callback(new Error('CORS access rejected by College ERP security policy.'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Request body limits
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Apply general API rate limiter
if (CONFIG.NODE_ENV === 'production') {
  app.use('/api', apiLimiter);
}

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    institution: CONFIG.COLLEGE_NAME,
    code: CONFIG.COLLEGE_CODE,
    environment: CONFIG.NODE_ENV,
    version: '1.0.0',
  });
});

// Mount All 12 Modules
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/departments', departmentRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/faculty', facultyRoutes);
app.use('/api/v1/academics', academicRoutes);
app.use('/api/v1/timetable', timetableRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/fees', feeRoutes);
app.use('/api/v1/library', libraryRoutes);
app.use('/api/v1/notices', noticeRoutes);
app.use('/api/v1/dashboards', dashboardRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/responsibilities', responsibilityRoutes);
app.use('/api/v1/data-sync', dataSyncRoutes);

// SPA fallback — serve index.html for all non-API routes so React Router works
if (fs.existsSync(frontendDistPath)) {
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// 404 Route Not Found Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.method} ${req.originalUrl}' does not exist on this server.`,
  });
});

// Centralized Error Handler Middleware
app.use(errorHandler);

export default app;
