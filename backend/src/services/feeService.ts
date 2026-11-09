export interface FeeCalculationInput {
  baseAmount: number;
  discountAmount?: number;
  dueDate: Date | string;
  lateFeePerDay?: number;
  currentDate?: Date | string;
  amountPaid?: number;
}

export interface CalculatedFeeLedger {
  baseAmount: number;
  discountAmount: number;
  penaltyAmount: number;
  totalDue: number;
  amountPaid: number;
  balanceDue: number;
  overdueDays: number;
  isOverdue: boolean;
  paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'PENDING' | 'OVERDUE';
}

export class FeeService {
  /**
   * Calculates fee dues, overdue days, late fee penalty, and payment status.
   */
  static calculateLedger(input: FeeCalculationInput): CalculatedFeeLedger {
    const base = Math.max(0, input.baseAmount);
    const discount = Math.max(0, input.discountAmount || 0);
    const lateFeePerDay = Math.max(0, input.lateFeePerDay ?? 50.0);
    const paid = Math.max(0, input.amountPaid || 0);

    const due = new Date(input.dueDate);
    const current = input.currentDate ? new Date(input.currentDate) : new Date();

    // Check overdue days (only whole positive days)
    const diffTime = current.getTime() - due.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const overdueDays = diffDays > 0 ? diffDays : 0;
    const isOverdue = overdueDays > 0;

    // Penalty is applied if overdue and there remains unpaid balance
    const penaltyAmount = isOverdue ? Number((overdueDays * lateFeePerDay).toFixed(2)) : 0.0;

    const netFeeBeforePenalty = Math.max(0, base - discount);
    const totalDue = Number((netFeeBeforePenalty + penaltyAmount).toFixed(2));
    const balanceDue = Number(Math.max(0, totalDue - paid).toFixed(2));

    let paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'PENDING' | 'OVERDUE' = 'PENDING';

    if (balanceDue <= 0 && totalDue > 0) {
      paymentStatus = 'PAID';
    } else if (paid > 0 && balanceDue > 0) {
      paymentStatus = 'PARTIALLY_PAID';
    } else if (isOverdue && balanceDue > 0) {
      paymentStatus = 'OVERDUE';
    } else {
      paymentStatus = 'PENDING';
    }

    return {
      baseAmount: base,
      discountAmount: discount,
      penaltyAmount,
      totalDue,
      amountPaid: paid,
      balanceDue,
      overdueDays,
      isOverdue,
      paymentStatus,
    };
  }

  /**
   * Generates unique invoice and receipt numbers with structured prefixes.
   */
  static generateInvoiceNumber(collegeCode = 'AITE', semester = 1): string {
    const random = Math.floor(100000 + Math.random() * 900000);
    const year = new Date().getFullYear();
    return `INV-${collegeCode}-${year}-S${semester}-${random}`;
  }

  static generateReceiptNumber(collegeCode = 'AITE'): string {
    const random = Math.floor(100000 + Math.random() * 900000);
    const timestamp = Date.now().toString().slice(-4);
    return `REC-${collegeCode}-${timestamp}-${random}`;
  }
}
