import { GRADING_SCALE } from '../config';

export interface SubjectMarksInput {
  internalMarks: number;
  theoryMarks: number;
  practicalMarks?: number;
  maxInternalMarks?: number;
  maxExternalMarks?: number;
  credits: number;
}

export interface CalculatedSubjectGrade {
  totalMarks: number;
  percentage: number;
  letterGrade: string;
  gradePoint: number;
  status: 'PASS' | 'FAIL';
  credits: number;
}

export interface SemesterResultCalculationInput {
  subjects: {
    subjectCode: string;
    credits: number;
    gradePoint: number;
    status: 'PASS' | 'FAIL';
  }[];
  previousSemesters?: {
    totalCredits: number;
    sgpa: number;
  }[];
}

export class GradingService {
  /**
   * Calculates total marks, percentage, letter grade, and grade points for a single subject.
   */
  static calculateSubjectMarks(input: SubjectMarksInput): CalculatedSubjectGrade {
    const internal = Math.max(0, input.internalMarks || 0);
    const theory = Math.max(0, input.theoryMarks || 0);
    const practical = Math.max(0, input.practicalMarks || 0);

    const totalMarks = Number((internal + theory + practical).toFixed(2));
    const maxTotal = (input.maxInternalMarks || 30) + (input.maxExternalMarks || 70);
    const percentage = Number(((totalMarks / maxTotal) * 100).toFixed(2));

    let letterGrade = 'F';
    let gradePoint = 0.0;
    let status: 'PASS' | 'FAIL' = 'FAIL';

    for (const tier of GRADING_SCALE) {
      if (percentage >= tier.minPercentage) {
        letterGrade = tier.grade;
        gradePoint = tier.point;
        status = tier.grade === 'F' ? 'FAIL' : 'PASS';
        break;
      }
    }

    return {
      totalMarks,
      percentage,
      letterGrade,
      gradePoint,
      status,
      credits: input.credits,
    };
  }

  /**
   * Calculates SGPA (Semester Grade Point Average):
   * SGPA = Sum(Credits_i * GradePoint_i) / Sum(Credits_i)
   */
  static calculateSGPA(subjects: { credits: number; gradePoint: number; status: 'PASS' | 'FAIL' }[]): {
    totalCredits: number;
    earnedCredits: number;
    sgpa: number;
    resultStatus: 'PASSED' | 'FAILED' | 'PROMOTED';
  } {
    if (!subjects || subjects.length === 0) {
      return { totalCredits: 0, earnedCredits: 0, sgpa: 0.0, resultStatus: 'FAILED' };
    }

    let totalCredits = 0;
    let earnedCredits = 0;
    let weightedPoints = 0;
    let failCount = 0;

    for (const sub of subjects) {
      totalCredits += sub.credits;
      if (sub.status === 'PASS') {
        earnedCredits += sub.credits;
        weightedPoints += sub.credits * sub.gradePoint;
      } else {
        failCount++;
      }
    }

    const sgpa = totalCredits > 0 ? Number((weightedPoints / totalCredits).toFixed(2)) : 0.0;
    let resultStatus: 'PASSED' | 'FAILED' | 'PROMOTED' = 'PASSED';

    if (failCount > 0) {
      // Promoted if failed in at most 2 subjects, otherwise failed
      resultStatus = failCount <= 2 ? 'PROMOTED' : 'FAILED';
    }

    return {
      totalCredits,
      earnedCredits,
      sgpa,
      resultStatus,
    };
  }

  /**
   * Calculates Cumulative Grade Point Average (CGPA) across multiple semesters:
   * CGPA = Sum(SGPA_j * Credits_j) / Sum(Credits_j)
   */
  static calculateCGPA(semesters: { sgpa: number; totalCredits: number }[]): number {
    if (!semesters || semesters.length === 0) return 0.0;

    let cumulativeCredits = 0;
    let cumulativePoints = 0;

    for (const sem of semesters) {
      if (sem.totalCredits > 0) {
        cumulativeCredits += sem.totalCredits;
        cumulativePoints += sem.sgpa * sem.totalCredits;
      }
    }

    if (cumulativeCredits === 0) return 0.0;
    return Number((cumulativePoints / cumulativeCredits).toFixed(2));
  }
}
