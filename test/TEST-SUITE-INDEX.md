# BLIRD — Complete Industry-Standard Test Suite
**Coverage: Unit | Integration | E2E | Security | Performance | Contract | Accessibility**

---

## TEST SUITE STRUCTURE

```
tests/
├── unit/
│   ├── eligibility.test.ts          ← Donation eligibility rules (medical logic)
│   ├── blood-compatibility.test.ts  ← Blood type compatibility matrix
│   ├── validators.test.ts           ← BD phone validation, formatters
│   ├── geo.test.ts                  ← Radius expansion, distance calc
│   ├── auth-service.test.ts         ← Auth business logic
│   ├── request-service.test.ts      ← Blood request business logic
│   ├── notification-service.test.ts ← Notification routing logic
│   └── payment-service.test.ts      ← Payment calculation, webhook verify
│
├── integration/
│   ├── auth.integration.test.ts     ← Register, login, OTP, logout flows
│   ├── requests.integration.test.ts ← Blood request CRUD, rate limits
│   ├── donors.integration.test.ts   ← Donor search, proximity, filters
│   ├── health.integration.test.ts   ← Health records, eligibility API
│   ├── history.integration.test.ts  ← Donation history, pagination
│   ├── notifications.integration.test.ts ← Notification CRUD, read/unread
│   ├── payments.integration.test.ts ← Payment flow, webhooks
│   ├── users.integration.test.ts    ← Profile, location, avatar
│   └── admin.integration.test.ts    ← Admin endpoints, role-gated access
│
├── e2e/
│   ├── auth-flow.e2e.ts             ← Registration + login full flow
│   ├── create-request.e2e.ts        ← Blood request creation flow
│   ├── donor-discovery.e2e.ts       ← Search, filter, view donor
│   ├── health-records.e2e.ts        ← Add health record, view eligibility
│   ├── payment-flow.e2e.ts          ← bKash payment end-to-end
│   └── notification-flow.e2e.ts     ← Receive and interact with notifications
│
├── security/
│   ├── auth-security.test.ts        ← Token tampering, replay attacks
│   ├── rls-enforcement.test.ts      ← Supabase RLS cross-user access
│   ├── injection.test.ts            ← SQL, XSS, NoSQL injection attempts
│   ├── rate-limiting.test.ts        ← All rate limit thresholds
│   └── rbac.test.ts                 ← Role boundary enforcement
│
├── performance/
│   ├── geo-query.perf.test.ts       ← PostGIS query benchmarks
│   ├── api-load.perf.test.ts        ← Concurrent request handling
│   └── notification-throughput.test.ts ← FCM broadcast speed
│
├── contract/
│   ├── api-schema.contract.test.ts  ← Response shape validation
│   └── webhook-signature.contract.test.ts ← Payment webhook verification
│
├── accessibility/
│   └── mobile-a11y.test.ts          ← Screen reader, tap targets, contrast
│
├── setup/
│   ├── vitest.config.ts
│   ├── global.setup.ts              ← DB seeding, Firebase mock init
│   ├── global.teardown.ts           ← Cleanup test DB
│   └── helpers/
│       ├── db.helpers.ts            ← Create/clean test users, requests
│       ├── auth.helpers.ts          ← Mock Firebase tokens, configure mocks
│       ├── request.helpers.ts       ← HTTP request factories
│       └── fixtures/
│           ├── users.fixtures.ts
│           ├── requests.fixtures.ts
│           └── health.fixtures.ts
```

---

## COVERAGE REQUIREMENTS

| Layer | Min Coverage | Reason |
|-------|-------------|--------|
| Unit tests | 90% | Business logic must be airtight |
| Integration | 100% endpoints | Every route tested |
| Security | 100% OWASP checks | Non-negotiable for health data |
| E2E | 6 critical flows | Auth, request, search, health, payment, notification |

---

## RUN COMMANDS

```bash
pnpm test:unit          # Unit tests only (fast, ~10s)
pnpm test:integration   # Integration tests (~60s)
pnpm test:security      # Security tests (~30s)
pnpm test:performance   # Performance benchmarks (~120s)
pnpm test:contract      # API contract tests (~20s)
pnpm test:e2e:android   # E2E on Android emulator
pnpm test:e2e:ios       # E2E on iOS simulator
pnpm test:ci            # All except E2E (CI pipeline)
pnpm test:all           # Everything
pnpm test:coverage      # With coverage report
```
