# AI Safety & Development Policy - IPE-24 Classroom

This policy is MANDATORY for all AI agents working on this project. All instructions here MUST be followed to prevent data loss and maintain system integrity.

## 1. Mandatory Backups
- **BEFORE** modifying `schema.prisma`, `.env`, or any core configuration file, you MUST create a backup:
  - Example: `copy apps/web/prisma/schema.prisma apps/web/prisma/schema.prisma.bak_[timestamp]`
- **BEFORE** running `db push` or `migrate dev` that involves data loss, you MUST export critical data if possible or verify with the user.

## 2. Feature Isolation (Database)
- When implementing a new feature, do NOT modify unrelated models or global configurations.
- Focus your database changes only on the models required for the specific task.
- If a global change is needed (e.g., User model), document exactly why and create a backup first.

## 3. Documentation Requirements
- Every feature update or bug fix MUST be documented in `apps/web/docs/FEATURES.md` (or a relevant feature-specific doc).
- Documentation must include:
  - Purpose of the change.
  - Schema modifications (if any).
  - New API endpoints or environment variables.
  - Instructions for local testing.

## 4. Work Verification
- Always run `npm run dev` after changes to verify the application still builds and runs.
- Check the console for Prisma or Next.js errors immediately after any schema sync.

## 5. Persistence of Knowledge
- All AI agents must read these rules before starting any task.
- If you find the project in an inconsistent state (e.g., schema vs DB mismatch), fix it immediately following the backup rules.

---
*Created by Antigravity on April 30, 2026*
