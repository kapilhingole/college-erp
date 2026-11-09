import { describe, it, expect } from 'vitest';
import { TimetableConflictService, TimetableSlotItem } from '../src/services/timetableConflictService';

describe('TimetableConflictService - Conflict Prevention Engine', () => {
  const existingSlots: TimetableSlotItem[] = [
    {
      id: 'slot-1',
      dayOfWeek: 'MONDAY',
      startTime: '09:00',
      endTime: '10:00',
      facultyId: 'fac-turing',
      roomNumber: 'Room-301',
      sectionId: 'sec-cse-a',
    },
    {
      id: 'slot-2',
      dayOfWeek: 'MONDAY',
      startTime: '10:00',
      endTime: '11:00',
      facultyId: 'fac-hopper',
      roomNumber: 'Room-302',
      sectionId: 'sec-cse-b',
    },
  ];

  it('should detect FACULTY_DOUBLE_BOOKED when the same professor is booked during an overlapping window', () => {
    const targetSlot: TimetableSlotItem = {
      dayOfWeek: 'MONDAY',
      startTime: '09:30',
      endTime: '10:30',
      facultyId: 'fac-turing', // Already in Room 301 from 09:00 to 10:00
      roomNumber: 'Room-305',
      sectionId: 'sec-cse-b',
    };

    const conflict = TimetableConflictService.detectConflict(targetSlot, existingSlots);

    expect(conflict.hasConflict).toBe(true);
    expect(conflict.type).toBe('FACULTY_DOUBLE_BOOKED');
    expect(conflict.message).toContain('Faculty member is already scheduled');
  });

  it('should detect ROOM_DOUBLE_BOOKED when a room is booked for another class during an overlapping window', () => {
    const targetSlot: TimetableSlotItem = {
      dayOfWeek: 'MONDAY',
      startTime: '09:15',
      endTime: '10:15',
      facultyId: 'fac-shannon',
      roomNumber: 'Room-301', // Room 301 is occupied 09:00 - 10:00
      sectionId: 'sec-ece-a',
    };

    const conflict = TimetableConflictService.detectConflict(targetSlot, existingSlots);

    expect(conflict.hasConflict).toBe(true);
    expect(conflict.type).toBe('ROOM_DOUBLE_BOOKED');
    expect(conflict.message).toContain('Room Room-301 is already occupied');
  });

  it('should detect SECTION_OVERLAP when a section is scheduled for two classes at once', () => {
    const targetSlot: TimetableSlotItem = {
      dayOfWeek: 'MONDAY',
      startTime: '09:00',
      endTime: '10:00',
      facultyId: 'fac-shannon',
      roomNumber: 'Lab-1',
      sectionId: 'sec-cse-a', // Section A is already attending class in Room 301
    };

    const conflict = TimetableConflictService.detectConflict(targetSlot, existingSlots);

    expect(conflict.hasConflict).toBe(true);
    expect(conflict.type).toBe('SECTION_OVERLAP');
  });

  it('should allow scheduling when slots are strictly consecutive (touching boundaries without overlap)', () => {
    const targetSlot: TimetableSlotItem = {
      dayOfWeek: 'MONDAY',
      startTime: '10:00', // Previous ends at 10:00
      endTime: '11:00',
      facultyId: 'fac-turing',
      roomNumber: 'Room-301',
      sectionId: 'sec-cse-a',
    };

    const conflict = TimetableConflictService.detectConflict(targetSlot, existingSlots);

    expect(conflict.hasConflict).toBe(false);
  });

  it('should allow scheduling on different days with same faculty, room, and section', () => {
    const targetSlot: TimetableSlotItem = {
      dayOfWeek: 'TUESDAY', // Different day
      startTime: '09:00',
      endTime: '10:00',
      facultyId: 'fac-turing',
      roomNumber: 'Room-301',
      sectionId: 'sec-cse-a',
    };

    const conflict = TimetableConflictService.detectConflict(targetSlot, existingSlots);

    expect(conflict.hasConflict).toBe(false);
  });
});
