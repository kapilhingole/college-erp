import { describe, it, expect } from 'vitest';
import { LibraryFineService } from '../src/services/libraryFineService';

describe('LibraryFineService - Lending & Overdue Fine Calculations', () => {
  it('should calculate zero fine when book is returned on or before due date', () => {
    const issueDate = new Date('2024-03-01');
    const dueDate = new Date('2024-03-15');
    const returnDate = new Date('2024-03-14'); // Returned 1 day early

    const fine = LibraryFineService.calculateFine({
      issueDate,
      dueDate,
      returnDate,
      dailyFineRate: 5.0,
    });

    expect(fine.overdueDays).toBe(0);
    expect(fine.fineAmount).toBe(0.0);
    expect(fine.isOverdue).toBe(false);
    expect(fine.status).toBe('RETURNED');
  });

  it('should calculate fine proportionally to overdue days when returned late', () => {
    const issueDate = new Date('2024-03-01T00:00:00Z');
    const dueDate = new Date('2024-03-15T00:00:00Z');
    const returnDate = new Date('2024-03-20T00:00:00Z'); // 5 days late

    const fine = LibraryFineService.calculateFine({
      issueDate,
      dueDate,
      returnDate,
      dailyFineRate: 10.0, // 10 per day
    });

    expect(fine.overdueDays).toBe(5);
    expect(fine.fineAmount).toBe(50.0);
    expect(fine.isOverdue).toBe(true);
    expect(fine.status).toBe('RETURNED');
  });

  it('should generate default due date 14 days after issue date', () => {
    const issueDate = new Date('2024-05-01');
    const dueDate = LibraryFineService.getDefaultDueDate(issueDate, 14);

    const diffDays = Math.round((dueDate.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(14);
  });
});
