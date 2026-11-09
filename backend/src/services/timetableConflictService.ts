export interface TimetableSlotItem {
  id?: string;
  dayOfWeek: string;
  startTime: string; // e.g. "09:00" or "09:30"
  endTime: string;   // e.g. "10:00" or "10:30"
  facultyId: string;
  roomNumber: string;
  sectionId: string;
  subjectId?: string;
}

export interface ConflictResult {
  hasConflict: boolean;
  type?: 'FACULTY_DOUBLE_BOOKED' | 'ROOM_DOUBLE_BOOKED' | 'SECTION_OVERLAP';
  message?: string;
  conflictingSlot?: TimetableSlotItem;
}

export class TimetableConflictService {
  /**
   * Converts "HH:MM" string to minutes from midnight for accurate overlap comparison.
   */
  static timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.trim().split(':').map((val) => parseInt(val, 10));
    return hours * 60 + (minutes || 0);
  }

  /**
   * Checks whether two time windows [s1, e1) and [s2, e2) overlap.
   */
  static isTimeOverlapping(s1: string, e1: string, s2: string, e2: string): boolean {
    const start1 = this.timeToMinutes(s1);
    const end1 = this.timeToMinutes(e1);
    const start2 = this.timeToMinutes(s2);
    const end2 = this.timeToMinutes(e2);

    return Math.max(start1, start2) < Math.min(end1, end2);
  }

  /**
   * Detects any conflict for a target slot against existing timetable slots.
   */
  static detectConflict(
    targetSlot: TimetableSlotItem,
    existingSlots: TimetableSlotItem[]
  ): ConflictResult {
    // Basic validation: end time must be after start time
    if (this.timeToMinutes(targetSlot.endTime) <= this.timeToMinutes(targetSlot.startTime)) {
      return {
        hasConflict: true,
        type: 'SECTION_OVERLAP',
        message: 'Invalid slot time: End time must be after start time.',
      };
    }

    for (const slot of existingSlots) {
      // Skip comparing against self when updating
      if (targetSlot.id && slot.id && targetSlot.id === slot.id) {
        continue;
      }

      // Conflicts can only happen on the same day
      if (slot.dayOfWeek.toUpperCase() !== targetSlot.dayOfWeek.toUpperCase()) {
        continue;
      }

      // Check if time windows overlap
      const overlaps = this.isTimeOverlapping(
        targetSlot.startTime,
        targetSlot.endTime,
        slot.startTime,
        slot.endTime
      );

      if (overlaps) {
        // 1. Faculty conflict
        if (slot.facultyId === targetSlot.facultyId) {
          return {
            hasConflict: true,
            type: 'FACULTY_DOUBLE_BOOKED',
            message: `Faculty member is already scheduled for another class on ${slot.dayOfWeek} between ${slot.startTime} and ${slot.endTime}.`,
            conflictingSlot: slot,
          };
        }

        // 2. Room conflict
        if (slot.roomNumber.trim().toLowerCase() === targetSlot.roomNumber.trim().toLowerCase()) {
          return {
            hasConflict: true,
            type: 'ROOM_DOUBLE_BOOKED',
            message: `Room ${slot.roomNumber} is already occupied on ${slot.dayOfWeek} between ${slot.startTime} and ${slot.endTime}.`,
            conflictingSlot: slot,
          };
        }

        // 3. Section conflict
        if (slot.sectionId === targetSlot.sectionId) {
          return {
            hasConflict: true,
            type: 'SECTION_OVERLAP',
            message: `Section already has another class scheduled on ${slot.dayOfWeek} between ${slot.startTime} and ${slot.endTime}.`,
            conflictingSlot: slot,
          };
        }
      }
    }

    return { hasConflict: false };
  }
}
