import { CONFIG } from '../config';

export interface BookIssueCalculationInput {
  issueDate: Date | string;
  dueDate: Date | string;
  returnDate?: Date | string | null;
  dailyFineRate?: number;
  finePaid?: boolean;
}

export interface CalculatedBookFine {
  overdueDays: number;
  isOverdue: boolean;
  fineAmount: number;
  finePaid: boolean;
  status: 'ISSUED' | 'RETURNED' | 'OVERDUE';
}

export class LibraryFineService {
  /**
   * Calculates overdue days, fine amount, and status for a library book issue record.
   */
  static calculateFine(input: BookIssueCalculationInput): CalculatedBookFine {
    const due = new Date(input.dueDate);
    const resolvedReturn = input.returnDate ? new Date(input.returnDate) : new Date();
    const dailyRate = Math.max(0, input.dailyFineRate ?? CONFIG.LIBRARY_FINE_PER_DAY);

    // Calculate whole overdue days
    const diffTime = resolvedReturn.getTime() - due.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const overdueDays = diffDays > 0 ? diffDays : 0;
    const isOverdue = overdueDays > 0;

    const fineAmount = isOverdue ? Number((overdueDays * dailyRate).toFixed(2)) : 0.0;

    let status: 'ISSUED' | 'RETURNED' | 'OVERDUE' = 'ISSUED';
    if (input.returnDate) {
      status = 'RETURNED';
    } else if (isOverdue) {
      status = 'OVERDUE';
    } else {
      status = 'ISSUED';
    }

    return {
      overdueDays,
      isOverdue,
      fineAmount,
      finePaid: input.finePaid ?? false,
      status,
    };
  }

  /**
   * Default book borrowing period in days (e.g., 14 days).
   */
  static getDefaultDueDate(issueDate = new Date(), borrowingPeriodDays = 14): Date {
    const due = new Date(issueDate);
    due.setDate(due.getDate() + borrowingPeriodDays);
    return due;
  }
}
