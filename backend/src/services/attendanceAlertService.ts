import { CONFIG } from '../config';

export interface AttendanceRecordItem {
  id: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  lectureSession: {
    id: string;
    sessionDate: Date | string;
    subject: {
      id: string;
      code: string;
      name: string;
    };
  };
}

export interface SubjectAttendanceSummary {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  totalConducted: number;
  attended: number;
  absent: number;
  excused: number;
  percentage: number;
  isDefaulter: boolean;
  requiredClassesToReachThreshold: number;
}

export interface StudentAttendanceEvaluation {
  studentId: string;
  totalLectures: number;
  totalAttended: number;
  overallPercentage: number;
  isOverallDefaulter: boolean;
  subjectSummaries: SubjectAttendanceSummary[];
  alertMessage?: string;
}

export class AttendanceAlertService {
  /**
   * Evaluates student attendance records and computes percentage and <75% threshold alerts.
   */
  static evaluateStudentAttendance(
    studentId: string,
    records: AttendanceRecordItem[],
    minThreshold = CONFIG.ATTENDANCE_MIN_THRESHOLD
  ): StudentAttendanceEvaluation {
    const subjectMap = new Map<
      string,
      {
        subjectCode: string;
        subjectName: string;
        conducted: number;
        attended: number;
        absent: number;
        excused: number;
      }
    >();

    let totalLectures = 0;
    let totalAttended = 0;

    for (const rec of records) {
      const sub = rec.lectureSession.subject;
      if (!subjectMap.has(sub.id)) {
        subjectMap.set(sub.id, {
          subjectCode: sub.code,
          subjectName: sub.name,
          conducted: 0,
          attended: 0,
          absent: 0,
          excused: 0,
        });
      }

      const item = subjectMap.get(sub.id)!;
      item.conducted += 1;
      totalLectures += 1;

      if (rec.status === 'PRESENT' || rec.status === 'LATE') {
        item.attended += 1;
        totalAttended += 1;
      } else if (rec.status === 'EXCUSED') {
        item.excused += 1;
        item.attended += 1; // Excused counts towards attendance
        totalAttended += 1;
      } else {
        item.absent += 1;
      }
    }

    const subjectSummaries: SubjectAttendanceSummary[] = [];

    for (const [subId, data] of subjectMap.entries()) {
      const percentage =
        data.conducted > 0 ? Number(((data.attended / data.conducted) * 100).toFixed(2)) : 100.0;
      const isDefaulter = percentage < minThreshold;

      // Calculate how many consecutive upcoming classes the student must attend to reach minThreshold
      // (attended + x) / (conducted + x) >= threshold / 100
      // 100 * attended + 100 * x >= threshold * conducted + threshold * x
      // x * (100 - threshold) >= threshold * conducted - 100 * attended
      let requiredClasses = 0;
      if (isDefaulter && minThreshold < 100) {
        const numerator = (minThreshold * data.conducted) - (100 * data.attended);
        const denominator = 100 - minThreshold;
        requiredClasses = Math.ceil(Math.max(0, numerator / denominator));
      }

      subjectSummaries.push({
        subjectId: subId,
        subjectCode: data.subjectCode,
        subjectName: data.subjectName,
        totalConducted: data.conducted,
        attended: data.attended,
        absent: data.absent,
        excused: data.excused,
        percentage,
        isDefaulter,
        requiredClassesToReachThreshold: requiredClasses,
      });
    }

    const overallPercentage =
      totalLectures > 0 ? Number(((totalAttended / totalLectures) * 100).toFixed(2)) : 100.0;
    const isOverallDefaulter = overallPercentage < minThreshold;

    let alertMessage: string | undefined = undefined;
    if (isOverallDefaulter) {
      alertMessage = `ATTENDANCE ALERT: Your overall attendance is ${overallPercentage}%, which is below the mandatory minimum of ${minThreshold}%. You are at risk of debarment from examinations.`;
    }

    return {
      studentId,
      totalLectures,
      totalAttended,
      overallPercentage,
      isOverallDefaulter,
      subjectSummaries,
      alertMessage,
    };
  }
}
