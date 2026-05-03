// apps/web/src/lib/routine-logic.ts

/**
 * Determine student lab group from studentId last digit
 */
export function getStudentGroup(studentId: string | null | undefined): 'ODD' | 'EVEN' | null {
  if (!studentId) return null;
  const lastDigit = parseInt(studentId.slice(-1), 10);
  if (isNaN(lastDigit)) return null;
  return lastDigit % 2 === 0 ? 'EVEN' : 'ODD';
}

/**
 * Get the Monday of the week for a given date
 */
export function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

/**
 * Get the day name from a Date
 */
export function getDayName(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long' });
}

/**
 * Map weekType + studentGroup to weekParity for BaseRoutine filtering.
 */
export function getEffectiveWeekParity(weekType: 'A' | 'B', studentGroup: 'ODD' | 'EVEN' | null): 'ODD' | 'EVEN' {
  if (!studentGroup) return weekType === 'A' ? 'EVEN' : 'ODD';
  if (studentGroup === 'EVEN') {
    return weekType === 'A' ? 'EVEN' : 'ODD';
  } else {
    return weekType === 'A' ? 'ODD' : 'EVEN';
  }
}

/**
 * Determine if a routine entry should be shown this week.
 */
export function matchesWeekParity(
  routine: { weekParity: string; isLab: boolean; courseCode: string; targetGroup: string },
  effectiveParity: 'ODD' | 'EVEN',
): boolean {
  if (routine.weekParity !== 'ALL') {
    return routine.weekParity === effectiveParity;
  }
  return true;
}

/**
 * Merge base routines with overrides
 */
export function mergeRoutines(baseRoutines: any[], overrides: any[]) {
  return baseRoutines.map((base) => {
    const override = overrides.find(
      (o) => o.baseRoutineId === base.id &&
             (o.type === 'CANCELLED' || o.type === 'ROOM_CHANGE' || o.type === 'TIME_CHANGE')
    );

    if (override?.type === 'CANCELLED') {
      return {
        ...base,
        status: 'CANCELLED' as const,
        reason: override.reason,
        overrideId: override.id,
      };
    }

    if (override?.type === 'ROOM_CHANGE') {
      return {
        ...base,
        room: override.room || base.room,
        status: 'ROOM_CHANGED' as const,
        originalRoom: base.room,
        reason: override.reason,
        overrideId: override.id,
      };
    }

    if (override?.type === 'TIME_CHANGE') {
      return {
        ...base,
        startTime: override.startTime || base.startTime,
        endTime: override.endTime || base.endTime,
        room: override.room || base.room,
        status: 'TIME_CHANGED' as const,
        originalStartTime: base.startTime,
        originalEndTime: base.endTime,
        reason: override.reason,
        overrideId: override.id,
      };
    }

    return { ...base, status: 'NORMAL' as const };
  });
}
