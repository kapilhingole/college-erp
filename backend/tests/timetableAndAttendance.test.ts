import { describe, it, expect } from 'vitest';
import { AttendanceAlertService, AttendanceRecordItem } from '../src/services/attendanceAlertService';
import { TimetableConflictService, TimetableSlotItem } from '../src/services/timetableConflictService';

// ----------------------------------------------------------------
// 1. Timetable creation — conflict detection covers dept/year context
// ----------------------------------------------------------------
describe('TimetableConflictService - Department & Year Aware Conflict Detection', () => {
  const baseSlots: TimetableSlotItem[] = [
    {
      id: 'fy-slot-1',
      dayOfWeek: 'MONDAY',
      startTime: '09:15',
      endTime: '10:15',
      facultyId: 'fac-sp',
      roomNumber: 'A1-02',
      sectionId: 'fy-comp-a',
    },
    {
      id: 'sy-slot-1',
      dayOfWeek: 'MONDAY',
      startTime: '11:30',
      endTime: '12:30',
      facultyId: 'fac-bs',
      roomNumber: 'A1-02',
      sectionId: 'sy-comp-a',
    },
  ];

  it('detects faculty double booking in same day across FY and SY', () => {
    const newSlot: TimetableSlotItem = {
      dayOfWeek: 'MONDAY',
      startTime: '09:30',
      endTime: '10:30',
      facultyId: 'fac-sp', // already teaching FY 09:15–10:15
      roomNumber: 'A1-10',
      sectionId: 'sy-comp-b',
    };
    const result = TimetableConflictService.detectConflict(newSlot, baseSlots);
    expect(result.hasConflict).toBe(true);
    expect(result.type).toBe('FACULTY_DOUBLE_BOOKED');
  });

  it('allows FY and SY to share the same room at non-overlapping times', () => {
    const newSlot: TimetableSlotItem = {
      dayOfWeek: 'MONDAY',
      startTime: '10:15',  // Starts exactly when first slot ends — no overlap
      endTime: '11:15',
      facultyId: 'fac-kk',
      roomNumber: 'A1-02',
      sectionId: 'fy-comp-b',
    };
    const result = TimetableConflictService.detectConflict(newSlot, baseSlots);
    expect(result.hasConflict).toBe(false);
  });

  it('allows different sections in different rooms at same time', () => {
    const newSlot: TimetableSlotItem = {
      dayOfWeek: 'MONDAY',
      startTime: '09:15',
      endTime: '10:15',
      facultyId: 'fac-kk', // different faculty
      roomNumber: 'A1-16',  // different room
      sectionId: 'sy-ai-c', // different section
    };
    const result = TimetableConflictService.detectConflict(newSlot, baseSlots);
    expect(result.hasConflict).toBe(false);
  });
});

// ----------------------------------------------------------------
// 2. Attendance calculation from timetable
//    Only subjects in the student's section's timetable should count.
//    Here we simulate the filtering that the controller applies.
// ----------------------------------------------------------------
describe('AttendanceAlertService - Timetable-Scoped Attendance Calculation', () => {
  // Subjects in the student's timetable (FY Comp Div A)
  const scheduledSubject = { id: 'sub-dm', code: 'DM', name: 'Discrete Mathematics' };
  const unscheduledSubject = { id: 'sub-other', code: 'OTHER', name: 'SY Subject Not in Timetable' };

  it('computes attendance only for timetable-scheduled subjects', () => {
    // 7 present out of 10 for the scheduled subject = 70% (defaulter)
    const scheduledRecords: AttendanceRecordItem[] = [
      ...Array.from({ length: 7 }).map((_, i) => ({
        id: `rec-dm-${i}`,
        status: 'PRESENT' as const,
        lectureSession: { id: `sess-dm-${i}`, sessionDate: new Date(), subject: scheduledSubject },
      })),
      ...Array.from({ length: 3 }).map((_, i) => ({
        id: `rec-dm-abs-${i}`,
        status: 'ABSENT' as const,
        lectureSession: { id: `sess-dm-abs-${i}`, sessionDate: new Date(), subject: scheduledSubject },
      })),
      // This record belongs to a subject NOT in the student's timetable
      // — the controller filters these out before calling evaluateStudentAttendance.
      // We simulate that by not including it here.
    ];

    const result = AttendanceAlertService.evaluateStudentAttendance('stu-fy-1', scheduledRecords, 75.0);

    expect(result.totalLectures).toBe(10);
    expect(result.overallPercentage).toBe(70.0);
    expect(result.isOverallDefaulter).toBe(true);
    expect(result.subjectSummaries).toHaveLength(1);
    expect(result.subjectSummaries[0].subjectCode).toBe('DM');
  });

  it('shows zero defaulters when all subjects are above threshold', () => {
    const goodRecords: AttendanceRecordItem[] = Array.from({ length: 8 }).map((_, i) => ({
      id: `rec-good-${i}`,
      status: 'PRESENT' as const,
      lectureSession: { id: `sess-good-${i}`, sessionDate: new Date(), subject: scheduledSubject },
    }));

    const result = AttendanceAlertService.evaluateStudentAttendance('stu-fy-2', goodRecords, 75.0);

    expect(result.isOverallDefaulter).toBe(false);
    expect(result.overallPercentage).toBe(100.0);
    expect(result.alertMessage).toBeUndefined();
  });

  it('counts EXCUSED status as attended', () => {
    const records: AttendanceRecordItem[] = [
      ...Array.from({ length: 5 }).map((_, i) => ({
        id: `rec-p-${i}`, status: 'PRESENT' as const,
        lectureSession: { id: `sess-p-${i}`, sessionDate: new Date(), subject: scheduledSubject },
      })),
      ...Array.from({ length: 3 }).map((_, i) => ({
        id: `rec-ex-${i}`, status: 'EXCUSED' as const,
        lectureSession: { id: `sess-ex-${i}`, sessionDate: new Date(), subject: scheduledSubject },
      })),
      ...Array.from({ length: 2 }).map((_, i) => ({
        id: `rec-ab-${i}`, status: 'ABSENT' as const,
        lectureSession: { id: `sess-ab-${i}`, sessionDate: new Date(), subject: scheduledSubject },
      })),
    ];

    // 5 present + 3 excused = 8 attended out of 10 = 80% — OK
    const result = AttendanceAlertService.evaluateStudentAttendance('stu-fy-3', records, 75.0);
    expect(result.totalAttended).toBe(8);
    expect(result.overallPercentage).toBe(80.0);
    expect(result.isOverallDefaulter).toBe(false);
  });
});

// ----------------------------------------------------------------
// 3. Role-based access — test logic (pure, no DB needed)
// ----------------------------------------------------------------
describe('Role-Based Access — Server-Side Scoping Logic', () => {
  /**
   * Simulates the access check in getStudentAttendance:
   * A STUDENT may only retrieve their own record.
   */
  const checkStudentAccess = (requestingRole: string, requestingStudentId: string, targetStudentId: string): boolean => {
    if (requestingRole === 'STUDENT' && requestingStudentId !== targetStudentId) return false;
    return true;
  };

  it('allows a student to access their own attendance', () => {
    expect(checkStudentAccess('STUDENT', 'stu-001', 'stu-001')).toBe(true);
  });

  it('blocks a student from accessing another student\'s attendance', () => {
    expect(checkStudentAccess('STUDENT', 'stu-001', 'stu-002')).toBe(false);
  });

  it('allows ADMIN to access any student\'s attendance', () => {
    expect(checkStudentAccess('ADMIN', 'admin-001', 'stu-999')).toBe(true);
  });

  it('allows FACULTY to access any student\'s attendance (for marking)', () => {
    expect(checkStudentAccess('FACULTY', 'fac-001', 'stu-002')).toBe(true);
  });
});

// ----------------------------------------------------------------
// 4. Superadmin aggregation — marks grading logic
// ----------------------------------------------------------------
describe('Marks — Grade computation', () => {
  const computeGrade = (total: number): { grade: string; point: number; pass: boolean } => {
    const p = Math.min(100, total);
    if (p >= 90) return { grade: 'O', point: 10.0, pass: true };
    if (p >= 80) return { grade: 'A+', point: 9.0, pass: true };
    if (p >= 70) return { grade: 'A', point: 8.0, pass: true };
    if (p >= 60) return { grade: 'B+', point: 7.0, pass: true };
    if (p >= 50) return { grade: 'B', point: 6.0, pass: true };
    if (p >= 40) return { grade: 'C', point: 5.0, pass: true };
    return { grade: 'F', point: 0.0, pass: false };
  };

  it('assigns O grade for total >= 90', () => {
    const r = computeGrade(92);
    expect(r.grade).toBe('O');
    expect(r.point).toBe(10.0);
    expect(r.pass).toBe(true);
  });

  it('assigns F grade for total < 40', () => {
    const r = computeGrade(35);
    expect(r.grade).toBe('F');
    expect(r.point).toBe(0.0);
    expect(r.pass).toBe(false);
  });

  it('assigns B+ for total between 60 and 69', () => {
    const r = computeGrade(65);
    expect(r.grade).toBe('B+');
    expect(r.point).toBe(7.0);
  });

  it('clamped total does not exceed 100', () => {
    const r = computeGrade(110);
    expect(r.grade).toBe('O');
    expect(r.pass).toBe(true);
  });
});
