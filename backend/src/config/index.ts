import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export const CONFIG = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'college_erp_jwt_super_secret_key_change_in_production_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  ATTENDANCE_MIN_THRESHOLD: parseFloat(process.env.ATTENDANCE_MIN_THRESHOLD || '75.0'),
  LIBRARY_FINE_PER_DAY: parseFloat(process.env.LIBRARY_FINE_PER_DAY || '5.0'),
  COLLEGE_NAME: process.env.COLLEGE_NAME || 'Zeal College of Engineering and Research',
  COLLEGE_CODE: process.env.COLLEGE_CODE || 'ZCOER',
};

// Standard 10-point Academic Grading Scale
export const GRADING_SCALE = [
  { minPercentage: 90, grade: 'O',  point: 10.0, description: 'Outstanding' },
  { minPercentage: 80, grade: 'A+', point: 9.0,  description: 'Excellent' },
  { minPercentage: 70, grade: 'A',  point: 8.0,  description: 'Very Good' },
  { minPercentage: 60, grade: 'B+', point: 7.0,  description: 'Good' },
  { minPercentage: 50, grade: 'B',  point: 6.0,  description: 'Above Average' },
  { minPercentage: 40, grade: 'C',  point: 5.0,  description: 'Pass' },
  { minPercentage: 0,  grade: 'F',  point: 0.0,  description: 'Fail' },
];
