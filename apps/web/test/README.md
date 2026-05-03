# IPE-24 Classroom — Industry-Standard Test Suite
**Synthesized from BLIRD project standards.**

## Structure
```
apps/web/test/
├── helpers/
│   ├── db.ts           ← Prisma helpers (createTestUser, cleanupDatabase)
│   └── auth.ts         ← NextAuth mocking utilities
├── unit/
│   └── routine-logic.test.ts  ← Core business logic (parity, lab detection)
├── integration/
│   └── announcements.test.ts  ← API + DB verification
├── security/
│   └── rbac.test.ts           ← Role-based access control enforcement
└── fixtures/           ← Sample data (TBD)
```

## Running Tests
Tests are configured with Vitest.

```bash
# Run all tests
npm test

# Run only unit tests
npx vitest apps/web/test/unit

# Run only integration tests
npx vitest apps/web/test/integration

# Run only security tests
npx vitest apps/web/test/security
```

## Coverage Requirements
- **Unit**: 100% for `routine-logic.ts` (Core parity system)
- **Integration**: All critical CRUD routes (Announcements, Routine, Resources)
- **Security**: 100% coverage of Role-Based Access Control (RBAC)

## Key Patterns
- **Database**: Each integration test uses `cleanupDatabase()` in `beforeEach` to ensure isolation.
- **Auth**: Use the mocked `auth` from `@/lib/auth` to simulate different user roles.
- **Business Logic**: Extracted into `src/lib/routine-logic.ts` to allow testing without hitting the DB.
