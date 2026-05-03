// apps/web/test/unit/routine-logic.test.ts
import { describe, it, expect } from 'vitest';
import { 
  getStudentGroup, 
  getMonday, 
  getDayName, 
  getEffectiveWeekParity, 
  matchesWeekParity, 
  mergeRoutines 
} from '@/lib/routine-logic';

describe('Routine Logic — Student Group Detection', () => {
  it('detects EVEN group for student ID ending in even digit', () => {
    expect(getStudentGroup('200041122')).toBe('EVEN');
    expect(getStudentGroup('200041120')).toBe('EVEN');
  });

  it('detects ODD group for student ID ending in odd digit', () => {
    expect(getStudentGroup('200041121')).toBe('ODD');
    expect(getStudentGroup('200041123')).toBe('ODD');
  });

  it('returns null for missing or invalid student ID', () => {
    expect(getStudentGroup(null)).toBe(null);
    expect(getStudentGroup(undefined)).toBe(null);
    expect(getStudentGroup('invalid')).toBe(null);
  });
});

describe('Routine Logic — Date Helpers', () => {
  it('getMonday: returns the Monday of the current week', () => {
    // 2026-05-04 is a Monday
    const monday = new Date('2026-05-04');
    expect(getMonday(new Date('2026-05-04')).toDateString()).toBe(monday.toDateString());
    expect(getMonday(new Date('2026-05-06')).toDateString()).toBe(monday.toDateString()); // Wed
    expect(getMonday(new Date('2026-05-03')).toDateString()).toBe(new Date('2026-04-27').toDateString()); // Sun -> prev Mon
  });

  it('getDayName: returns correct day name', () => {
    expect(getDayName(new Date('2026-05-04'))).toBe('Monday');
    expect(getDayName(new Date('2026-05-05'))).toBe('Tuesday');
  });
});

describe('Routine Logic — Week Parity', () => {
  it('Type A: EVEN group gets EVEN parity, ODD group gets ODD parity', () => {
    expect(getEffectiveWeekParity('A', 'EVEN')).toBe('EVEN');
    expect(getEffectiveWeekParity('A', 'ODD')).toBe('ODD');
  });

  it('Type B: EVEN group gets ODD parity, ODD group gets EVEN parity', () => {
    expect(getEffectiveWeekParity('B', 'EVEN')).toBe('ODD');
    expect(getEffectiveWeekParity('B', 'ODD')).toBe('EVEN');
  });

  it('Default parity when no student group is provided', () => {
    expect(getEffectiveWeekParity('A', null)).toBe('EVEN');
    expect(getEffectiveWeekParity('B', null)).toBe('ODD');
  });
});

describe('Routine Logic — Routine Merging', () => {
  const mockBase = [
    { id: '1', courseCode: 'CSE-101', room: '101', startTime: '08:00', endTime: '09:00' },
    { id: '2', courseCode: 'CSE-102', room: '102', startTime: '09:00', endTime: '10:00' },
  ];

  it('merges NORMAL routines when no overrides exist', () => {
    const result = mergeRoutines(mockBase, []);
    expect(result[0].status).toBe('NORMAL');
    expect(result[1].status).toBe('NORMAL');
  });

  it('applies CANCELLED override', () => {
    const overrides = [{ baseRoutineId: '1', type: 'CANCELLED', reason: 'Holiday' }];
    const result = mergeRoutines(mockBase, overrides);
    expect(result[0].status).toBe('CANCELLED');
    expect(result[0].reason).toBe('Holiday');
    expect(result[1].status).toBe('NORMAL');
  });

  it('applies ROOM_CHANGE override', () => {
    const overrides = [{ baseRoutineId: '2', type: 'ROOM_CHANGE', room: '999' }];
    const result = mergeRoutines(mockBase, overrides);
    expect(result[1].status).toBe('ROOM_CHANGED');
    expect(result[1].room).toBe('999');
    expect(result[1].originalRoom).toBe('102');
  });

  it('applies TIME_CHANGE override', () => {
    const overrides = [{ baseRoutineId: '1', type: 'TIME_CHANGE', startTime: '14:00', endTime: '15:00' }];
    const result = mergeRoutines(mockBase, overrides);
    expect(result[0].status).toBe('TIME_CHANGED');
    expect(result[0].startTime).toBe('14:00');
    expect(result[0].originalStartTime).toBe('08:00');
  });
});
