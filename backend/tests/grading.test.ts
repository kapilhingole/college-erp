import { describe, it, expect } from 'vitest';
import { GradingService } from '../src/services/gradingService';

describe('GradingService - Academic Grading & GPA/CGPA Calculations', () => {
  it('should accurately calculate percentage, letter grade O (10.0) for >= 90%', () => {
    const result = GradingService.calculateSubjectMarks({
      internalMarks: 28,
      theoryMarks: 65,
      maxInternalMarks: 30,
      maxExternalMarks: 70,
      credits: 4,
    });

    expect(result.totalMarks).toBe(93);
    expect(result.percentage).toBe(93);
    expect(result.letterGrade).toBe('O');
    expect(result.gradePoint).toBe(10.0);
    expect(result.status).toBe('PASS');
  });

  it('should assign letter grade A+ (9.0) for 80-89%', () => {
    const result = GradingService.calculateSubjectMarks({
      internalMarks: 25,
      theoryMarks: 58,
      maxInternalMarks: 30,
      maxExternalMarks: 70,
      credits: 4,
    });

    expect(result.totalMarks).toBe(83);
    expect(result.percentage).toBe(83);
    expect(result.letterGrade).toBe('A+');
    expect(result.gradePoint).toBe(9.0);
    expect(result.status).toBe('PASS');
  });

  it('should assign grade F (0.0) and status FAIL when marks fall below 40%', () => {
    const result = GradingService.calculateSubjectMarks({
      internalMarks: 10,
      theoryMarks: 25,
      maxInternalMarks: 30,
      maxExternalMarks: 70,
      credits: 3,
    });

    expect(result.totalMarks).toBe(35);
    expect(result.percentage).toBe(35);
    expect(result.letterGrade).toBe('F');
    expect(result.gradePoint).toBe(0.0);
    expect(result.status).toBe('FAIL');
  });

  it('should compute weighted SGPA accurately for a semester', () => {
    // Subject 1: 4 credits, Grade Point 9.0 (A+) -> 36 points
    // Subject 2: 4 credits, Grade Point 8.0 (A)  -> 32 points
    // Subject 3: 3 credits, Grade Point 10.0 (O) -> 30 points
    // Total Credits = 11, Total Weighted Points = 98 -> SGPA = 98 / 11 = 8.91
    const sgpaResult = GradingService.calculateSGPA([
      { credits: 4, gradePoint: 9.0, status: 'PASS' },
      { credits: 4, gradePoint: 8.0, status: 'PASS' },
      { credits: 3, gradePoint: 10.0, status: 'PASS' },
    ]);

    expect(sgpaResult.totalCredits).toBe(11);
    expect(sgpaResult.earnedCredits).toBe(11);
    expect(sgpaResult.sgpa).toBe(8.91);
    expect(sgpaResult.resultStatus).toBe('PASSED');
  });

  it('should flag student as PROMOTED when failing in at most 2 subjects', () => {
    const sgpaResult = GradingService.calculateSGPA([
      { credits: 4, gradePoint: 8.0, status: 'PASS' },
      { credits: 4, gradePoint: 0.0, status: 'FAIL' },
    ]);

    expect(sgpaResult.resultStatus).toBe('PROMOTED');
    expect(sgpaResult.earnedCredits).toBe(4);
    expect(sgpaResult.totalCredits).toBe(8);
  });

  it('should flag student as FAILED when failing in more than 2 subjects', () => {
    const sgpaResult = GradingService.calculateSGPA([
      { credits: 4, gradePoint: 0.0, status: 'FAIL' },
      { credits: 4, gradePoint: 0.0, status: 'FAIL' },
      { credits: 3, gradePoint: 0.0, status: 'FAIL' },
    ]);

    expect(sgpaResult.resultStatus).toBe('FAILED');
    expect(sgpaResult.earnedCredits).toBe(0);
  });

  it('should compute cumulative CGPA across multiple semesters with differing credit loads', () => {
    // Sem 1: SGPA 8.5, 20 credits -> 170 points
    // Sem 2: SGPA 9.0, 22 credits -> 198 points
    // Total = 368 / 42 = 8.76
    const cgpa = GradingService.calculateCGPA([
      { sgpa: 8.5, totalCredits: 20 },
      { sgpa: 9.0, totalCredits: 22 },
    ]);

    expect(cgpa).toBe(8.76);
  });
});
