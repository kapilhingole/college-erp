import { describe, it, expect } from 'vitest';
import { AttendanceAlertService, AttendanceRecordItem } from '../src/services/attendanceAlertService';

describe('AttendanceAlertService - Percentage & <75% Low Attendance Alert Engine', () => {
  const dummySubject = {
    id: 'sub-dsa-101',
    code: 'CS301',
    name: 'Data Structures',
  };

  it('should calculate attendance >= 75% as in good standing with zero alerts', () => {
    // 8 PRESENT out of 10 lectures = 80.0%
    const records: AttendanceRecordItem[] = [
      ...Array.from({ length: 8 }).map((_, i) => ({
        id: `rec-${i}`,
        status: 'PRESENT' as const,
        lectureSession: { id: `sess-${i}`, sessionDate: new Date(), subject: dummySubject },
      })),
      ...Array.from({ length: 2 }).map((_, i) => ({
        id: `rec-abs-${i}`,
        status: 'ABSENT' as const,
        lectureSession: { id: `sess-abs-${i}`, sessionDate: new Date(), subject: dummySubject },
      })),
    ];

    const evalResult = AttendanceAlertService.evaluateStudentAttendance('student-1', records, 75.0);

    expect(evalResult.totalLectures).toBe(10);
    expect(evalResult.totalAttended).toBe(8);
    expect(evalResult.overallPercentage).toBe(80.0);
    expect(evalResult.isOverallDefaulter).toBe(false);
    expect(evalResult.alertMessage).toBeUndefined();
    expect(evalResult.subjectSummaries[0].isDefaulter).toBe(false);
  });

  it('should trigger ATTENDANCE ALERT when attendance falls strictly below 75%', () => {
    // 6 PRESENT out of 10 lectures = 60.0% (<75%)
    const records: AttendanceRecordItem[] = [
      ...Array.from({ length: 6 }).map((_, i) => ({
        id: `rec-${i}`,
        status: 'PRESENT' as const,
        lectureSession: { id: `sess-${i}`, sessionDate: new Date(), subject: dummySubject },
      })),
      ...Array.from({ length: 4 }).map((_, i) => ({
        id: `rec-abs-${i}`,
        status: 'ABSENT' as const,
        lectureSession: { id: `sess-abs-${i}`, sessionDate: new Date(), subject: dummySubject },
      })),
    ];

    const evalResult = AttendanceAlertService.evaluateStudentAttendance('student-2', records, 75.0);

    expect(evalResult.totalLectures).toBe(10);
    expect(evalResult.totalAttended).toBe(6);
    expect(evalResult.overallPercentage).toBe(60.0);
    expect(evalResult.isOverallDefaulter).toBe(true);
    expect(evalResult.alertMessage).toContain('ATTENDANCE ALERT');
    expect(evalResult.alertMessage).toContain('below the mandatory minimum of 75%');
    expect(evalResult.subjectSummaries[0].isDefaulter).toBe(true);

    // To reach 75% from (6 + x) / (10 + x) >= 0.75:
    // 6 + x >= 7.5 + 0.75x => 0.25x >= 1.5 => x >= 6 classes
    expect(evalResult.subjectSummaries[0].requiredClassesToReachThreshold).toBe(6);
  });
});
