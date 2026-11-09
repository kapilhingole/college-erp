import { Request, Response } from 'express';
import { prisma } from '../../config';

// Standard predefined column templates for all statutory monthly formats
export const REPORT_STANDARD_COLUMNS: Record<string, string[]> = {
  'M 1': ['Sr. No.', 'Subject / Course', 'Year', 'Class / Division', 'Verification Date', 'Contents Checked', 'Status'],
  'M 2': ['Sr. No.', 'Date of Activity', 'Title / Theme of Activity', 'Type of Innovation Activity', 'Level of Activity', 'Organized By / Under', 'Mode of Activity', 'Objective / Purpose', 'Target Participants', 'No. of Participants', 'Faculty Involved / Mentor'],
  'M 3': ['Sr. No.', 'Year', 'COURSE FACULTY', 'Division', 'Subject', 'Total Students', 'Feedback Rating (%)', 'Remarks'],
  'M 4': ['Sr. No.', 'Feedback Type', 'Target Group', 'Feedback Collection Date', 'Feedback Mode', 'Total Respondents', 'Parameters / Criteria', 'Rating Scale', 'Strengths Identified', 'Areas for Improvement', 'Action Taken / Proposed', 'Supporting Documents', 'Report Submitted To'],
  'M 5': ['Sr. No.', 'Student Name', 'Roll No.', 'Year', 'Department', 'Division', 'GFM Name', 'Attendance (%)', 'Term Work / Practical Progress', 'Overall Academic Performance', 'Counseling Conducted', 'Identified Issues', 'Corrective Actions Suggested', 'Parent Communication Done', 'Remarks'],
  'M 6': ['Sr. No.', 'Faculty Name', 'Designation', 'Department', 'Class / Div', 'Subject Handled', 'Syllabus Target (%)', 'Actual Completion (%)', 'Gaps Identified', 'Remedial Action Planned', 'HOD Remarks'],
  'M 7': ['Sr. No.', 'Date', 'Type of Mentoring', 'Faculty Mentor', 'Student PRN', 'Student Name', 'Class / Div', 'Issues Discussed', 'Action Suggested', 'Follow-up Date', 'Status'],
  'M 8': ['Sr. No.', 'Compliance Area / Standard', 'Requirement / Clause', 'Responsible Person / Committee', 'Status', 'Date of Compliance Check', 'Evidence / Supporting Documents', 'Non-Conformities Identified', 'Corrective Action Taken', 'Follow-Up Required', 'Remarks', 'Report Submitted To'],
  'M 9': ['Sr. No.', 'Date / Week', 'Type of Activity', 'Title / Description of Activity', 'Objective / Purpose', 'Target Group / Year', 'Mode of Activity', 'No. of Participants', 'Resource Person / Organization', 'Outcome / Key Learning', 'Entrepreneurial Stage Addressed', 'Follow-up / Action Taken', 'Support Required (If Any)', 'Remarks / Suggestions'],
  'M 10': ['Sr. No.', 'Name of Event Coordinator', 'Department', 'Date of Event', 'Competition Type', 'Level of Competition', 'Title / Theme', 'Objective / Purpose', 'Mode of Event', 'Target Group / Year', 'No. of Participants', 'Judges / Evaluators', 'Winners / Awards', 'Outcome / Key Learning', 'Evidence Verified', 'Issues / Challenges (if any)', 'Support Required', 'Remarks / Summary'],
  'M 11': ['Sr. No.', 'Program Title', 'Type of Program', 'Mode of Conduction', 'Date(s)', 'Duration (Hrs / Days)', 'Resource Person / Trainer', 'Organized By', 'Target Group (Class / Year)', 'No. of Participants', 'Outcome / Skill Developed', 'Feedback Rating', 'Remarks / Action Taken'],
  'M 12': ['Sr. No.', 'Date of Inspection / Activity', 'Area / Lab / Facility', 'Type of Safety Check', 'Responsible Person', 'Status', 'Observations / Issues', 'Corrective Action Taken', 'Follow-Up Required', 'Compliance Documents Maintained', 'Remarks', 'Report Submitted To'],
  'M 13': ['Sr. No.', 'Date', 'Student Association Activity', 'Convenor Faculty', 'Target Audience', 'Participant Count', 'Guest Speaker', 'Expenses (INR)', 'Student Feedback', 'Remarks'],
  'M 14': ['Sr. No.', 'Date of Grievance received', 'Grievance Source', 'Grievance Type', 'Grievance Description', 'Assigned To / Responsible Person', 'Action Taken', 'Resolution Date', 'Status', 'Remarks / Follow-up'],
  'M 15': ['Sr. No.', 'Date', 'Activity Name', 'Target Class', 'Resource Person', 'Attendance', 'Assessment Conducted', 'Outcome Achieved', 'Remarks'],
};

/** Normalizes report code like "M10", "M 10", "m10" into "M 10" or "M10" */
function getStandardColumns(reportNo: string): string[] {
  const normWithSpace = reportNo.trim().replace(/^M(\d+)/i, 'M $1');
  const normNoSpace = reportNo.trim().replace(/^M\s+(\d+)/i, 'M$1');

  return (
    REPORT_STANDARD_COLUMNS[normWithSpace] ||
    REPORT_STANDARD_COLUMNS[normNoSpace] ||
    ['Sr. No.', 'Activity / Description', 'Department', 'Responsible Faculty', 'Status', 'Date', 'Remarks']
  );
}

export class ReportsController {
  /**
   * List all monthly report submissions
   */
  static async listSubmissions(req: Request, res: Response): Promise<void> {
    try {
      const { month, status, reportNo } = req.query;

      const where: any = {};
      if (month) where.reportMonth = String(month);
      if (status) where.status = String(status);
      if (reportNo) where.reportNo = String(reportNo);

      // Auto-ensure M14 exists in monthly submissions table if missing
      const existingM14 = await (prisma as any).monthlyReportSubmission.findFirst({
        where: {
          OR: [{ reportNo: 'M 14' }, { reportNo: 'M14' }],
        },
      });

      if (!existingM14) {
        await (prisma as any).monthlyReportSubmission.create({
          data: {
            reportNo: 'M 14',
            reportTitle: 'DEPARTMENT LEVEL GRIEVANCE REDRESSAL REPORT',
            docNumber: 'ZEAL/ZCOER/REPORTS/M-14',
            campus: 'ZCOER INDORI',
            reportMonth: 'October 2026',
            reportPeriod: '01-10-2026 to 31-10-2026',
            department: 'Computer Engineering',
            totalEntries: 0,
            status: 'DRAFT',
          },
        });
      }

      const submissions = await (prisma as any).monthlyReportSubmission.findMany({
        where,
        orderBy: [{ reportNo: 'asc' }],
        include: {
          _count: {
            select: { entries: true },
          },
        },
      });

      res.json({
        success: true,
        data: submissions.map((sub: any) => ({
          ...sub,
          totalEntries: sub._count?.entries ?? sub.totalEntries,
          defaultColumns: getStandardColumns(sub.reportNo),
        })),
      });
    } catch (error: any) {
      console.error('Failed to list monthly submissions:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve monthly report submissions' });
    }
  }

  /**
   * Get single submission by ID with all its data entries
   */
  static async getSubmissionById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const submission = await (prisma as any).monthlyReportSubmission.findUnique({
        where: { id },
        include: {
          entries: {
            orderBy: { srNo: 'asc' },
          },
        },
      });

      if (!submission) {
        res.status(404).json({ success: false, message: 'Monthly report submission not found' });
        return;
      }

      // Parse JSON rowData for each entry
      const parsedEntries = submission.entries.map((entry: any) => {
        let parsed = {};
        try {
          parsed = JSON.parse(entry.rowData);
        } catch {
          parsed = { raw: entry.rowData };
        }
        return {
          id: entry.id,
          srNo: entry.srNo,
          data: parsed,
          createdAt: entry.createdAt,
        };
      });

      // Extract unique column keys across all entries
      const columnSet = new Set<string>();
      parsedEntries.forEach((entry: any) => {
        Object.keys(entry.data || {}).forEach((k) => columnSet.add(k));
      });

      // If no entries exist yet, fallback to predefined standard columns so headers are visible!
      let columns = Array.from(columnSet);
      if (columns.length === 0) {
        columns = getStandardColumns(submission.reportNo);
      }

      res.json({
        success: true,
        data: {
          ...submission,
          columns,
          entries: parsedEntries,
        },
      });
    } catch (error: any) {
      console.error('Failed to get monthly submission:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve monthly report submission details' });
    }
  }

  /**
   * Get submission by report number (e.g., "M 1" or "M1" or "M14")
   */
  static async getSubmissionByReportNo(req: Request, res: Response): Promise<void> {
    try {
      const { reportNo } = req.params;
      const normalizedNo = reportNo.trim();

      let submission = await (prisma as any).monthlyReportSubmission.findFirst({
        where: {
          OR: [
            { reportNo: normalizedNo },
            { reportNo: normalizedNo.replace(/\s+/g, '') },
            { reportNo: normalizedNo.replace(/^M(\d+)/i, 'M $1') },
          ],
        },
        include: {
          entries: {
            orderBy: { srNo: 'asc' },
          },
        },
      });

      // If not yet instantiated, create a draft submission for it
      if (!submission) {
        const resp = await (prisma as any).roleResponsibility.findFirst({
          where: {
            OR: [
              { reportNo: normalizedNo },
              { reportNo: normalizedNo.replace(/\s+/g, '') },
              { reportNo: normalizedNo.replace(/^M(\d+)/i, 'M $1') },
            ],
          },
        });

        submission = await (prisma as any).monthlyReportSubmission.create({
          data: {
            reportNo: normalizedNo,
            reportTitle: resp?.title || `Report ${normalizedNo}`,
            docNumber: `ZEAL/ZCOER/REPORTS/${normalizedNo.replace(/\s+/g, '-')}`,
            campus: 'ZCOER INDORI',
            reportMonth: 'October 2026',
            reportPeriod: '01-10-2026 to 31-10-2026',
            department: 'Computer Engineering',
            totalEntries: 0,
            status: 'DRAFT',
          },
          include: {
            entries: true,
          },
        });
      }

      const parsedEntries = submission.entries.map((entry: any) => {
        let parsed = {};
        try {
          parsed = JSON.parse(entry.rowData);
        } catch {
          parsed = { raw: entry.rowData };
        }
        return {
          id: entry.id,
          srNo: entry.srNo,
          data: parsed,
          createdAt: entry.createdAt,
        };
      });

      const columnSet = new Set<string>();
      parsedEntries.forEach((entry: any) => {
        Object.keys(entry.data || {}).forEach((k) => columnSet.add(k));
      });

      let columns = Array.from(columnSet);
      if (columns.length === 0) {
        columns = getStandardColumns(submission.reportNo);
      }

      res.json({
        success: true,
        data: {
          ...submission,
          columns,
          entries: parsedEntries,
        },
      });
    } catch (error: any) {
      console.error('Failed to get submission by report no:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve report submission' });
    }
  }

  /**
   * Add a manual data entry into a monthly report submission
   */
  static async addEntry(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { rowData } = req.body;

      if (!rowData || typeof rowData !== 'object') {
        res.status(400).json({ success: false, message: 'rowData must be an object of key-value pairs' });
        return;
      }

      const submission = await (prisma as any).monthlyReportSubmission.findUnique({
        where: { id },
        include: {
          entries: {
            orderBy: { srNo: 'desc' },
            take: 1,
          },
        },
      });

      if (!submission) {
        res.status(404).json({ success: false, message: 'Monthly report submission not found' });
        return;
      }

      const nextSrNo = (submission.entries[0]?.srNo || 0) + 1;
      if (!rowData['Sr. No.'] && !rowData['Sr. No']) {
        rowData['Sr. No.'] = String(nextSrNo);
      }

      const newEntry = await (prisma as any).monthlyReportEntry.create({
        data: {
          submissionId: submission.id,
          srNo: nextSrNo,
          rowData: JSON.stringify(rowData),
        },
      });

      const updatedCount = await (prisma as any).monthlyReportEntry.count({
        where: { submissionId: submission.id },
      });

      await (prisma as any).monthlyReportSubmission.update({
        where: { id: submission.id },
        data: {
          totalEntries: updatedCount,
          status: 'SUBMITTED',
        },
      });

      await (prisma as any).roleResponsibility.updateMany({
        where: {
          OR: [
            { reportNo: submission.reportNo },
            { reportNo: submission.reportNo.replace(/\s+/g, '') },
          ],
        },
        data: { status: 'SUBMITTED' },
      });

      res.status(201).json({
        success: true,
        message: 'Report data entry successfully saved to database',
        data: {
          id: newEntry.id,
          srNo: newEntry.srNo,
          data: rowData,
          createdAt: newEntry.createdAt,
        },
      });
    } catch (error: any) {
      console.error('Failed to add report entry:', error);
      res.status(500).json({ success: false, message: 'Failed to save report entry' });
    }
  }

  /**
   * Delete a data entry from a monthly report submission
   */
  static async deleteEntry(req: Request, res: Response): Promise<void> {
    try {
      const { id, entryId } = req.params;

      await (prisma as any).monthlyReportEntry.delete({
        where: { id: entryId },
      });

      const updatedCount = await (prisma as any).monthlyReportEntry.count({
        where: { submissionId: id },
      });

      await (prisma as any).monthlyReportSubmission.update({
        where: { id },
        data: {
          totalEntries: updatedCount,
          status: updatedCount > 0 ? 'SUBMITTED' : 'DRAFT',
        },
      });

      res.json({
        success: true,
        message: 'Report entry deleted successfully',
      });
    } catch (error: any) {
      console.error('Failed to delete report entry:', error);
      res.status(500).json({ success: false, message: 'Failed to delete report entry' });
    }
  }
}
