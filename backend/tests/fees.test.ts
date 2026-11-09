import { describe, it, expect } from 'vitest';
import { FeeService } from '../src/services/feeService';

describe('FeeService - Financial Ledgers, Penalty & Dues Calculations', () => {
  it('should calculate PAID status when full amount is paid on time', () => {
    const futureDueDate = new Date();
    futureDueDate.setDate(futureDueDate.getDate() + 30);

    const ledger = FeeService.calculateLedger({
      baseAmount: 50000,
      discountAmount: 5000,
      dueDate: futureDueDate,
      amountPaid: 45000,
      lateFeePerDay: 50,
    });

    expect(ledger.baseAmount).toBe(50000);
    expect(ledger.discountAmount).toBe(5000);
    expect(ledger.penaltyAmount).toBe(0);
    expect(ledger.totalDue).toBe(45000);
    expect(ledger.amountPaid).toBe(45000);
    expect(ledger.balanceDue).toBe(0);
    expect(ledger.isOverdue).toBe(false);
    expect(ledger.paymentStatus).toBe('PAID');
  });

  it('should calculate PARTIALLY_PAID status when partial amount is paid before due date', () => {
    const futureDueDate = new Date();
    futureDueDate.setDate(futureDueDate.getDate() + 15);

    const ledger = FeeService.calculateLedger({
      baseAmount: 60000,
      dueDate: futureDueDate,
      amountPaid: 25000,
    });

    expect(ledger.totalDue).toBe(60000);
    expect(ledger.amountPaid).toBe(25000);
    expect(ledger.balanceDue).toBe(35000);
    expect(ledger.penaltyAmount).toBe(0);
    expect(ledger.paymentStatus).toBe('PARTIALLY_PAID');
  });

  it('should apply late fee penalty per day when fee is overdue', () => {
    const pastDueDate = new Date('2024-01-01T00:00:00Z');
    const currentDate = new Date('2024-01-11T00:00:00Z'); // Exactly 10 days later

    const ledger = FeeService.calculateLedger({
      baseAmount: 50000,
      dueDate: pastDueDate,
      currentDate,
      lateFeePerDay: 100, // 100 per day
      amountPaid: 0,
    });

    expect(ledger.overdueDays).toBe(10);
    expect(ledger.isOverdue).toBe(true);
    expect(ledger.penaltyAmount).toBe(1000); // 10 * 100
    expect(ledger.totalDue).toBe(51000);     // 50000 + 1000
    expect(ledger.balanceDue).toBe(51000);
    expect(ledger.paymentStatus).toBe('OVERDUE');
  });

  it('should format unique invoice and receipt numbers with prefix', () => {
    const invoice = FeeService.generateInvoiceNumber('AITE', 3);
    expect(invoice).toMatch(/^INV-AITE-\d{4}-S3-\d{6}$/);

    const receipt = FeeService.generateReceiptNumber('AITE');
    expect(receipt).toMatch(/^REC-AITE-\d{4}-\d{6}$/);
  });
});
