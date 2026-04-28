# Automated Routine System Documentation

This document provides a comprehensive overview of the automated routine system in the IPE-24 Classroom project, covering the database schema, automation logic, and key implementation files.

## 1. System Overview

The routine system is designed to provide students with a personalized, real-time timetable. It handles:
- **Personalization**: Filtering by student lab groups (ODD/EVEN).
- **Bi-weekly Rotations**: Managing bi-weekly labs using a Week A/B system.
- **Dynamic Overrides**: Handling cancellations, room changes, and makeup classes.
- **Automation**: Automatic calculation of parity and student grouping based on ID.

---

## 2. Database Schema (Prisma)

Located in `apps/web/prisma/schema.prisma`.

### BaseRoutine
The master schedule for the semester.
- `id`: Unique identifier (CUID).
- `courseCode`: e.g., "IPE 4201".
- `courseName`: Full name of the course.
- `dayOfWeek`: "Monday" through "Friday".
- `startTime` / `endTime`: String format "HH:mm".
- `room`: Class location.
- `teacher`: Instructor name.
- `targetGroup`: `ALL`, `ODD`, or `EVEN` (filters which students see this entry).
- `weekParity`: `ALL`, `ODD`, or `EVEN` (controls bi-weekly lab appearance).
- `isLab`: Boolean flag.

### RoutineOverride
Specific modifications for a single date.
- `type`: `CANCELLED`, `MAKEUP`, `ROOM_CHANGE`, `TIME_CHANGE`.
- `date`: Specific DateTime of the occurrence.
- `baseRoutineId`: Optional link to the original entry.
- `reason`: Explanation for the change.
- `targetGroup`: Filter for who the override affects.

### RoutineWeek
Global state for the bi-weekly calendar.
- `calendarWeekStart`: Monday of the week.
- `weekType`: "A" or "B".
- `isSkipped`: True if the rotation should pause (e.g., during mid-term break).
- `workingWeekNumber`: Sequential counter for active weeks.

---

## 3. Automation Logic

### Student Grouping
Defined in `apps/web/src/app/api/v1/routine/route.ts`:
- **Logic**: Students are automatically assigned to a group based on the last digit of their Student ID.
- **Rule**: Even last digit = `EVEN` group, Odd last digit = `ODD` group.

### Week Parity & Lab Rotations
The system uses a "Working Week" logic to handle bi-weekly labs:
1. **Week Type**: Every active week is assigned a type (A or B).
2. **Effective Parity**: A mapping function determines if a lab should be shown based on:
   - Current Week Type (A or B)
   - Student Group (ODD or EVEN)
   - Entry Parity (ODD or EVEN)

### Merging Logic
When a student requests their routine for a date:
1. The system fetches the `BaseRoutine` for that day.
2. It filters out entries based on the student's group and the current week's parity.
3. it fetches any `RoutineOverride` for that date.
4. It merges them:
   - `CANCELLED` → Hides or marks the class as inactive.
   - `ROOM_CHANGE` → Updates the room while keeping original metadata.
   - `MAKEUP` → Injects a completely new entry into the list.

---

## 4. Key Files

### Backend & API
- **API Route**: `apps/web/src/app/api/v1/routine/route.ts` (Core logic for students).
- **Admin API**: `apps/web/src/app/api/v1/admin/routine/route.ts` (CRUD for admins).
- **Sheets Utility**: `apps/web/src/lib/google-sheets.ts` (Google Sheets sync).

### Frontend Components
- **Student Page**: `apps/web/src/app/(student)/routine/page.tsx`
- **Admin Management**: `apps/web/src/app/(admin)/admin/routine/page.tsx`
- **Grid UI**: `apps/web/src/components/routine/TimetableGrid.tsx` (Presumed based on logic).

---

## 5. API Endpoints

### Student Access
- `GET /api/v1/routine`: Fetch the base routine.
- `GET /api/v1/routine?date=YYYY-MM-DD`: Fetch the merged schedule for a specific day.
- `GET /api/v1/routine?week=YYYY-MM-DD`: Fetch the merged schedule for a full week.

### Admin Management
- `POST /api/v1/admin/routine/overrides`: Create a new cancellation or makeup class.
- `GET /api/v1/admin/routine`: Full unfiltered access to the schedule.

---

## 6. Google Sheets Integration

The system can optionally sync with a Google Sheet defined by `GOOGLE_SHEETS_ROUTINE_ID`.
- **Cache**: Routine data from sheets is cached in Redis for 5 minutes.
- **Syncing**: Used primarily for initial data entry or as a live-update fallback for admins who prefer editing spreadsheets.
