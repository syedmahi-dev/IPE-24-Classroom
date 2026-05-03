# Feature Updates

## Assignment Tracking in Exams
**Purpose**: Extends the existing "Exam" infrastructure to support "Assignments", allowing students to view assignment details, deadlines, and submission instructions, and giving them the ability to mark assignments as submitted.

**Schema Modifications**:
- `ExamType` enum added (`EXAM`, `ASSIGNMENT`).
- `Exam` model updated with `type`, `submissionLink`, `submissionMethod`, and `instructions`.
- `AssignmentSubmission` model created to link `Exam` (Assignments) to `User` (Students), storing their submission status.

**New/Modified API Endpoints**:
- `GET /api/v1/exams`: Includes current student's `submissions` in the response payload to display toggle states.
- `POST /api/v1/exams/[id]/submit`: New endpoint allowing students to mark an assignment as submitted. Upserts an `AssignmentSubmission` record.
- `POST/PATCH /api/v1/admin/exams`: Support assignment payloads (`type`, `submissionLink`, `submissionMethod`, `instructions`).

**Local Testing Instructions**:
1. Run `npx prisma db push` to ensure your database reflects the updated schema.
2. In the Admin Dashboard (`/admin/exams`), create a new entry and select "Assignment" as the Type. Enter submission links and instructions.
3. As a Student (`/exams`), view the new assignment, and click the "Mark as Submitted" button to toggle its status.
