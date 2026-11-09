import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config';
import { INITIAL_ROLES_RESPONSIBILITIES } from './responsibilities.data';

export class ResponsibilitiesController {
  /**
   * Auto-seed if database table is currently empty
   */
  private static async ensureInitialized() {
    try {
      const count = await prisma.roleResponsibility.count();
      if (count === 0) {
        for (const item of INITIAL_ROLES_RESPONSIBILITIES) {
          await prisma.roleResponsibility.create({
            data: {
              sheetNo: item.sheetNo,
              reportNo: item.reportNo,
              title: item.title,
              section: item.section,
              frequency: item.frequency,
              hyperlink: item.hyperlink || '',
              filledBy: item.filledBy,
              assignedFaculty: item.assignedFaculty || '',
              verifiedBy: item.verifiedBy || '',
              department: item.department || 'Mechanical Engineering',
              status: 'CONFIGURED',
            },
          });
        }
      }
    } catch (err) {
      console.warn('Auto-initialization of RoleResponsibility skipped or handled:', err);
    }
  }

  /**
   * List all compliance roles and formats with filtering
   */
  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      await ResponsibilitiesController.ensureInitialized();

      const { frequency, section, department, search } = req.query;

      const where: any = {};

      if (frequency && frequency !== 'ALL') {
        where.frequency = String(frequency);
      }

      if (section && section !== 'ALL') {
        where.section = String(section);
      }

      if (department) {
        where.department = String(department);
      }

      if (search) {
        const q = String(search).trim();
        where.OR = [
          { reportNo: { contains: q } },
          { title: { contains: q } },
          { filledBy: { contains: q } },
          { assignedFaculty: { contains: q } },
          { verifiedBy: { contains: q } },
          { section: { contains: q } },
        ];
      }

      const items = await prisma.roleResponsibility.findMany({
        where,
        orderBy: [
          { frequency: 'asc' },
          { reportNo: 'asc' },
        ],
      });

      res.json({
        success: true,
        data: items,
        meta: {
          total: items.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Summary KPI Statistics across all portfolios
   */
  public static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      await ResponsibilitiesController.ensureInitialized();

      const all = await prisma.roleResponsibility.findMany();

      const monthlyCount = all.filter((i: any) => i.frequency === 'Monthly').length;
      const semesterCount = all.filter((i: any) => i.frequency === 'Semester').length;
      const yearlyCount = all.filter((i: any) => i.frequency === 'Yearly').length;

      // Group by Section
      const sectionCounts: Record<string, number> = {};
      all.forEach((i: any) => {
        sectionCounts[i.section] = (sectionCounts[i.section] || 0) + 1;
      });

      const assignedCount = all.filter((i: any) => i.assignedFaculty && i.assignedFaculty.trim().length > 0).length;

      res.json({
        success: true,
        data: {
          totalFormats: all.length,
          monthlyCount,
          semesterCount,
          yearlyCount,
          assignedCount,
          unassignedCount: all.length - assignedCount,
          sectionCounts,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a single role / format item
   */
  public static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        sheetNo,
        reportNo,
        title,
        section,
        frequency,
        hyperlink,
        filledBy,
        assignedFaculty,
        verifiedBy,
        department,
        status,
        remarks,
      } = req.body;

      if (!reportNo || !title || !section || !frequency || !filledBy) {
        return res.status(400).json({
          success: false,
          message: 'Missing mandatory fields: reportNo, title, section, frequency, filledBy are required.',
        });
      }

      const item = await prisma.roleResponsibility.create({
        data: {
          sheetNo: sheetNo || '',
          reportNo,
          title,
          section,
          frequency,
          hyperlink: hyperlink || '',
          filledBy,
          assignedFaculty: assignedFaculty || '',
          verifiedBy: verifiedBy || '',
          department: department || 'Mechanical Engineering',
          status: status || 'CONFIGURED',
          remarks: remarks || '',
        },
      });

      res.status(201).json({
        success: true,
        data: item,
        message: 'Responsibility format created successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update an existing role / format (e.g. assign faculty, update link or status)
   */
  public static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const updated = await prisma.roleResponsibility.update({
        where: { id },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
      });

      res.json({
        success: true,
        data: updated,
        message: 'Responsibility format updated successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk import / replace responsibility rows
   */
  public static async bulkImport(req: Request, res: Response, next: NextFunction) {
    try {
      const { items } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'An array of items is required in the request body.',
        });
      }

      let createdCount = 0;
      let updatedCount = 0;

      for (const raw of items) {
        const reportNo = raw.reportNo || raw['Report No.'] || raw['Report No'];
        const title = raw.title || raw['Title of Format'] || raw['Title'];
        const section = raw.section || raw['Section'] || 'ACADEMIC ACTIVITY';
        const frequency = raw.frequency || raw['Frequency'] || 'Monthly';
        const filledBy = raw.filledBy || raw['Report to be filled by'] || 'Faculty';
        const assignedFaculty = raw.assignedFaculty || raw['Mechanical Faculty'] || raw['Assigned Faculty'] || '';
        const verifiedBy = raw.verifiedBy || raw['Report to be Verified and Reviewed by'] || '';
        const sheetNo = String(raw.sheetNo || raw['Sr. No. / Sheet No.'] || '');
        const hyperlink = raw.hyperlink || raw['Hyperlink for the Format'] || '';
        const department = raw.department || 'Mechanical Engineering';

        if (!reportNo || !title) continue;

        const existing = await prisma.roleResponsibility.findFirst({
          where: { reportNo },
        });

        if (existing) {
          await prisma.roleResponsibility.update({
            where: { id: existing.id },
            data: {
              title,
              section,
              frequency,
              filledBy,
              assignedFaculty,
              verifiedBy,
              hyperlink,
              department,
            },
          });
          updatedCount++;
        } else {
          await prisma.roleResponsibility.create({
            data: {
              sheetNo,
              reportNo,
              title,
              section,
              frequency,
              filledBy,
              assignedFaculty,
              verifiedBy,
              hyperlink,
              department,
              status: 'CONFIGURED',
            },
          });
          createdCount++;
        }
      }

      res.json({
        success: true,
        data: { createdCount, updatedCount, totalProcessed: items.length },
        message: `Successfully processed ${items.length} compliance formats (Created: ${createdCount}, Updated: ${updatedCount}).`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export all responsibilities as CSV
   */
  public static async exportCsv(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await prisma.roleResponsibility.findMany({
        orderBy: [{ frequency: 'asc' }, { reportNo: 'asc' }],
      });

      const header = [
        'Sr. No. / Sheet No.',
        'Report No.',
        'Title of Format',
        'Section',
        'Frequency',
        'Hyperlink for the Format',
        'Report to be filled by',
        'Assigned Faculty',
        'Report to be Verified and Reviewed by',
        'Department',
        'Status',
      ].join(',');

      const rows = items.map((i: any) =>
        [
          `"${i.sheetNo || ''}"`,
          `"${i.reportNo.replace(/"/g, '""')}"`,
          `"${i.title.replace(/"/g, '""')}"`,
          `"${i.section.replace(/"/g, '""')}"`,
          `"${i.frequency}"`,
          `"${(i.hyperlink || '').replace(/"/g, '""')}"`,
          `"${i.filledBy.replace(/"/g, '""')}"`,
          `"${(i.assignedFaculty || '').replace(/"/g, '""')}"`,
          `"${(i.verifiedBy || '').replace(/"/g, '""')}"`,
          `"${i.department}"`,
          `"${i.status}"`,
        ].join(',')
      );

      const csvContent = [header, ...rows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=zeal_roles_responsibilities_matrix.csv'
      );
      res.status(200).send(csvContent);
    } catch (error) {
      next(error);
    }
  }
}
