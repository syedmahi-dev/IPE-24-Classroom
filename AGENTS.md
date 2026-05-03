# IPE-24 Classroom - Unified AI Agent Instructions

This document is the **single source of truth** for all AI agents, assistants, and copilots working on the IPE-24 Classroom project. You MUST read and follow these rules every time you execute a command or task.

---

## 1. AI Safety & Database Policy (MANDATORY)
- **Mandatory Backups**: BEFORE modifying `schema.prisma`, `.env`, or any core configuration file, you MUST create a `.bak` backup (e.g., `copy apps/web/prisma/schema.prisma apps/web/prisma/schema.prisma.bak_[timestamp]`).
- **Data Preservation**: NEVER run `db push --accept-data-loss` or `migrate dev` that involves data loss without exporting critical data first or confirming with the user.
- **Feature Isolation**: Deal ONLY with the specific database models relevant to the current task. Do not modify unrelated models or global configs. If a global change is needed, document exactly why and create a backup.
- **Work Verification**: Always run `npm run dev` after changes to verify the application still builds and runs. Check the console for Prisma or Next.js errors immediately after any schema sync.
- **Persistence of Knowledge**: If you find the project in an inconsistent state (e.g., schema vs DB mismatch), fix it immediately following the backup rules.

## 2. UI/UX Design Rule (CRITICAL)
- **CRITICAL**: Whenever implementing, designing, changing, or fixing anything related to UI/UX, frontend interfaces, layouts, or visual styles, you MUST use the "UI/UX Pro Max" skill framework.
- **Workflow**:
  1. Review the `d:\IPE-24 Classroom\.agent\skills\ui-ux-pro-max\SKILL.md` instructions before writing UI code.
  2. Follow its Pre-Delivery Checklist strictly. Use Lucide SVG icons, smooth transitions (150-300ms), ensure light/dark mode contrast, correct layout spacings, and glassmorphism defaults (`.glass`, `.glass-dark`).
  3. Never output plain, flat, default layouts. Your design output must always be premium, interactive, well-animated, and highly responsive.

## 3. Development Guidelines & Workflow
- **Test-First Mindset**: Tests MUST pass before committing ANY code (`npm test`). Write tests for edge cases before implementing features.
- **API Pattern**: Follow the established pattern: `apiGuard()` -> validate with Zod -> query -> `apiResponse()`.
- **Validation**: Use Zod validators. Define them in `src/lib/validators.ts` and use them in routes.
- **Organization**: Organize components by feature. Group related components in folders.
- **Documentation**: Every feature update or bug fix MUST be documented in `apps/web/docs/FEATURES.md` (or a relevant doc). Documentation must include the purpose, schema modifications, new API endpoints, and local testing instructions.
- **Implementation Plan**: Check `IMPLEMENTATION_PLAN.md` to see what pages/routes are prioritized.
- **Reference Existing Patterns**: Don't invent new conventions; replicate the existing structure.
- **Commit Messages**: Be specific (e.g., "feat: add exam countdown timer" instead of "update code").
- **Ask for Clarification**: If unsure about architecture or requirements, ask the user.

## 4. Architecture & Key Patterns
- **Stack**: Next.js 14, TypeScript, Tailwind CSS v4, PostgreSQL 16 + pgvector, Redis 7, Prisma ORM, NextAuth.js v5.
- **API Routes Pattern**: Located in `src/app/api/v1/[resource]/route.ts`. Every route must have Auth Check (middleware), Role Check (handler), Input Validation (Zod), Error Handling (standardized JSON response), and Rate Limiting.
- **Component Pattern**: `(student)`, `(admin)`, `(auth)` route groups matching `components/[feature]/`.
- **Testing Categories**: Vitest (Unit), Vitest + Testing Library (Component), Vitest + Supertest (API), Playwright (E2E).

---
*Created by merging AI_SAFETY_POLICY.md, .cursorrules, .windsurfrules, and .github/copilot-instructions.md*
