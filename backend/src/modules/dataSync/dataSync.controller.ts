import { Request, Response, NextFunction } from 'express';
import * as XLSX from 'xlsx';
import { z } from 'zod';
import { AppError } from '../../middleware/errorHandler';
import { DataSyncService } from './dataSync.service';

const ingestSchema = z.object({
  fileBase64: z.string().min(1, 'Base64 file data is required'),
  fileName: z.string().min(1, 'File name is required'),
  entityType: z.enum(['AUTO', 'STUDENTS', 'MARKS', 'FEES']).default('AUTO'),
  mode: z.enum(['UPSERT', 'CREATE_ONLY', 'UPDATE_ONLY']).default('UPSERT'),
});

export class DataSyncController {
  /**
   * Preview incoming PDF, Excel, or CSV without modifying database
   */
  static async preview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { fileBase64, fileName, entityType } = ingestSchema.parse(req.body);

      const cleanBase64 = fileBase64.includes(';base64,') ? fileBase64.split(';base64,')[1] : fileBase64;
      const fileBuffer = Buffer.from(cleanBase64, 'base64');

      const { rows, fileType } = await DataSyncService.parseFile(fileBuffer, fileName);

      if (!rows || rows.length === 0) {
        throw new AppError('The uploaded file contains no readable tabular data or student records.', 400);
      }

      const detected = entityType === 'AUTO' ? DataSyncService.detectEntityType(rows) : entityType;

      res.json({
        success: true,
        message: `File parsed successfully into ${rows.length} records.`,
        data: {
          fileName,
          fileType,
          detectedEntity: detected,
          totalRows: rows.length,
          columns: Object.keys(rows[0] || {}),
          sampleRows: rows.slice(0, 10),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Process & synchronize data from PDF, Excel, or CSV into the portal
   */
  static async process(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { fileBase64, fileName, entityType, mode } = ingestSchema.parse(req.body);

      const cleanBase64 = fileBase64.includes(';base64,') ? fileBase64.split(';base64,')[1] : fileBase64;
      const fileBuffer = Buffer.from(cleanBase64, 'base64');

      const { rows, fileType } = await DataSyncService.parseFile(fileBuffer, fileName);

      if (!rows || rows.length === 0) {
        throw new AppError('The uploaded file contains no rows to process.', 400);
      }

      const targetEntity = entityType === 'AUTO' ? DataSyncService.detectEntityType(rows) : entityType;

      let result;
      switch (targetEntity) {
        case 'MARKS':
          result = await DataSyncService.syncMarks(rows, fileName, fileType);
          break;
        case 'FEES':
          result = await DataSyncService.syncFees(rows, fileName, fileType);
          break;
        case 'STUDENTS':
        default:
          result = await DataSyncService.syncStudents(rows, fileName, fileType);
          break;
      }

      res.json({
        success: true,
        message: `Universal Data Sync Completed: ${result.createdCount} created, ${result.updatedCount} updated, ${result.skippedCount} skipped.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download sample templates for rapid institutional imports
   */
  static async downloadTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity = 'students' } = req.params;

      let sampleData: any[] = [];
      let filename = 'template.xlsx';

      if (entity.toLowerCase() === 'marks') {
        filename = 'marks_sync_template.xlsx';
        sampleData = [
          { PRN: '1032230001', RollNumber: 'COMP0101', SubjectCode: 'CS301', InternalMarks: 26, ExternalMarks: 62 },
          { PRN: '1032230002', RollNumber: 'COMP0102', SubjectCode: 'CS301', InternalMarks: 28, ExternalMarks: 65 },
        ];
      } else if (entity.toLowerCase() === 'fees') {
        filename = 'fees_receipt_template.xlsx';
        sampleData = [
          { PRN: '1032230001', RollNumber: 'COMP0101', AmountPaid: 25000, TransactionId: 'TXN-BANK-8821' },
          { PRN: '1032230002', RollNumber: 'COMP0102', AmountPaid: 45000, TransactionId: 'TXN-BANK-8822' },
        ];
      } else {
        filename = 'students_portal_sync_template.xlsx';
        sampleData = [
          {
            PRN: '1032230001',
            RollNumber: 'COMP0101',
            FirstName: 'Aarav',
            LastName: 'Kulkarni',
            Email: 'aarav.k@student.zeal.edu.in',
            Phone: '9822001122',
            Department: 'COMP',
            Semester: 3,
            Section: 'Division A',
            Status: 'ACTIVE',
            Password: 'Student@123',
          },
          {
            PRN: '1032230002',
            RollNumber: 'COMP0102',
            FirstName: 'Sneha',
            LastName: 'Deshmukh',
            Email: 'sneha.d@student.zeal.edu.in',
            Phone: '9822001133',
            Department: 'COMP',
            Semester: 3,
            Section: 'Division A',
            Status: 'ACTIVE',
            Password: 'Student@123',
          },
        ];
      }

      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data_Sync');

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
}

