# Routine System Technical Specifications

This document outlines the technical implementation details of the automated routine logic, specifically the algorithms for grouping and parity.

## 1. Student Grouping Algorithm

**File**: `apps/web/src/app/api/v1/routine/route.ts`
**Function**: `getStudentGroup(studentId)`

```typescript
function getStudentGroup(studentId: string): 'ODD' | 'EVEN' | null {
  if (!studentId) return null
  const lastDigit = parseInt(studentId.slice(-1), 10)
  if (isNaN(lastDigit)) return null
  return lastDigit % 2 === 0 ? 'EVEN' : 'ODD'
}
```

## 2. Working Week & Parity Logic

The system maintains a rotational parity for bi-weekly classes.

### Week Type Determination
The system looks up the `RoutineWeek` table. If no record exists for the current Monday, it auto-calculates:
1. Count all non-skipped prior weeks.
2. `workingWeekNumber = count + 1`.
3. `weekType = workingWeekNumber % 2 === 1 ? 'A' : 'B'`.

### Effective Parity Mapping
The relationship between student groups and lab positions is handled by `getEffectiveWeekParity`.

| Week Type | Student Group | Effective Parity | Resulting Labs shown |
|-----------|---------------|------------------|----------------------|
| A         | EVEN          | EVEN             | Position A labs      |
| A         | ODD           | ODD              | Position B labs      |
| B         | EVEN          | ODD              | Position B labs      |
| B         | ODD           | EVEN             | Position A labs      |

## 3. Merge Strategy

The merging of `BaseRoutine` and `RoutineOverride` follows these priority rules:

1. **Cancellations**: If an override of type `CANCELLED` matches a `baseRoutineId` for the target date, the entry is flagged and usually hidden from the student view.
2. **Room Changes**: Overrides of type `ROOM_CHANGE` replace the `room` property while preserving the original `courseName`, `teacher`, and `time`.
3. **Time Changes**: Overrides of type `TIME_CHANGE` replace `startTime`, `endTime`, and optionally `room`.
4. **Makeups**: Any override of type `MAKEUP` on the target date is treated as a new entry and sorted into the timetable by its `startTime`.

## 4. Caching Strategy

**Implementation**: Redis
- **Key**: `routine:sheets` (for Google Sheets data)
- **TTL**: 300 seconds (5 minutes)
- **Invalidation**: Triggered manually by admins or when the `invalidateRoutineCache` utility is called after an update.
