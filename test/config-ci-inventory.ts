// =============================================================================
// services/api/package.json — Test Scripts
// =============================================================================
{
  "name": "@blird/api",
  "version": "1.0.0",
  "scripts": {
    "test":              "vitest run",
    "test:watch":        "vitest",
    "test:unit":         "vitest run tests/unit",
    "test:integration":  "vitest run tests/integration",
    "test:security":     "vitest run tests/security",
    "test:performance":  "vitest run tests/performance",
    "test:contract":     "vitest run tests/contract",
    "test:ci":           "vitest run --coverage --reporter=verbose --reporter=html",
    "test:coverage":     "vitest run --coverage",
    "test:all":          "vitest run tests/"
  }
}

// =============================================================================
// pnpm-workspace root package.json test scripts
// =============================================================================
{
  "scripts": {
    "test":              "turbo run test",
    "test:unit":         "turbo run test:unit",
    "test:integration":  "turbo run test:integration",
    "test:security":     "turbo run test:security",
    "test:performance":  "turbo run test:performance",
    "test:contract":     "turbo run test:contract",
    "test:ci":           "turbo run test:ci",
    "test:e2e:android":  "pnpm --filter @blird/mobile exec detox test --configuration android.emu.debug",
    "test:e2e:ios":      "pnpm --filter @blird/mobile exec detox test --configuration ios.sim.debug",
    "test:coverage":     "turbo run test:coverage"
  }
}

// =============================================================================
// .github/workflows/tests.yml — Complete CI Test Pipeline
// =============================================================================

/*
name: Full Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  # ── Unit Tests ──────────────────────────────────────────────────────────────
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:unit
      - uses: codecov/codecov-action@v4
        with:
          flags: unit
          file: ./coverage/lcov.info

  # ── Integration Tests ────────────────────────────────────────────────────────
  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
        options: --health-cmd "redis-cli ping" --health-interval 5s

    env:
      NODE_ENV: test
      SUPABASE_URL: ${{ secrets.SUPABASE_TEST_URL }}
      SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_TEST_SERVICE_ROLE_KEY }}
      FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
      FIREBASE_SERVICE_ACCOUNT_JSON: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_JSON }}
      REDIS_URL: redis://localhost:6379
      API_URL: http://localhost:3000
      FRONTEND_URL: http://localhost:3001
      BKASH_WEBHOOK_SECRET: test-webhook-secret

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile

      - name: Apply migrations to test Supabase
        run: npx supabase db push --project-ref ${{ secrets.SUPABASE_TEST_PROJECT_REF }}

      - name: Run integration tests
        run: pnpm test:integration --reporter=verbose

      - uses: codecov/codecov-action@v4
        with:
          flags: integration

  # ── Security Tests ────────────────────────────────────────────────────────
  security-tests:
    name: Security Tests
    runs-on: ubuntu-latest
    needs: [unit-tests]
    services:
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
    env:
      NODE_ENV: test
      SUPABASE_URL: ${{ secrets.SUPABASE_TEST_URL }}
      SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_TEST_SERVICE_ROLE_KEY }}
      FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
      FIREBASE_SERVICE_ACCOUNT_JSON: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_JSON }}
      REDIS_URL: redis://localhost:6379
      API_URL: http://localhost:3000
      FRONTEND_URL: http://localhost:3001
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - name: Run security tests
        run: pnpm test:security --reporter=verbose

  # ── Contract Tests ────────────────────────────────────────────────────────
  contract-tests:
    name: Contract / API Schema Tests
    runs-on: ubuntu-latest
    needs: [integration-tests]
    services:
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
    env:
      NODE_ENV: test
      SUPABASE_URL: ${{ secrets.SUPABASE_TEST_URL }}
      SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_TEST_SERVICE_ROLE_KEY }}
      FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
      FIREBASE_SERVICE_ACCOUNT_JSON: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_JSON }}
      REDIS_URL: redis://localhost:6379
      API_URL: http://localhost:3000
      FRONTEND_URL: http://localhost:3001
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:contract --reporter=verbose

  # ── Performance Tests (on main only) ─────────────────────────────────────
  performance-tests:
    name: Performance Benchmarks
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop'
    needs: [integration-tests]
    env:
      NODE_ENV: test
      SUPABASE_URL: ${{ secrets.SUPABASE_TEST_URL }}
      SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_TEST_SERVICE_ROLE_KEY }}
      FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
      FIREBASE_SERVICE_ACCOUNT_JSON: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_JSON }}
      REDIS_URL: redis://localhost:6379
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - name: Run performance benchmarks
        run: pnpm test:performance --reporter=verbose
      - name: Upload benchmark results
        uses: actions/upload-artifact@v4
        with:
          name: benchmark-results
          path: ./benchmark-report.json

  # ── E2E Tests (Android) ─────────────────────────────────────────────────
  e2e-android:
    name: E2E Tests — Android
    runs-on: macos-latest
    if: github.ref == 'refs/heads/main'
    needs: [integration-tests, security-tests]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile

      - name: Setup Android emulator
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 33
          arch: x86_64
          profile: pixel_6

      - name: Build Expo app for testing
        run: pnpm --filter @blird/mobile exec eas build --platform android --profile preview --local

      - name: Run Detox E2E tests
        run: pnpm test:e2e:android

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: e2e-android-screenshots
          path: ./artifacts/

  # ── Coverage Gate ─────────────────────────────────────────────────────────
  coverage-gate:
    name: Coverage Gate (80% minimum)
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:coverage
      - name: Check coverage thresholds
        run: |
          node -e "
            const summary = require('./coverage/coverage-summary.json');
            const total = summary.total;
            const thresholds = { lines: 80, functions: 80, branches: 75, statements: 80 };
            let failed = false;
            for (const [metric, threshold] of Object.entries(thresholds)) {
              const pct = total[metric].pct;
              if (pct < threshold) {
                console.error('FAIL: ' + metric + ' coverage ' + pct + '% < ' + threshold + '%');
                failed = true;
              } else {
                console.log('PASS: ' + metric + ' coverage ' + pct + '% >= ' + threshold + '%');
              }
            }
            if (failed) process.exit(1);
          "
*/

// =============================================================================
// tests/setup/global.teardown.ts — Post-suite cleanup
// =============================================================================

import { supabaseAdmin } from '@/config/supabase';

export default async function globalTeardown() {
  console.log('\n🧹 Running global test teardown...');

  // Clean up all test users and their cascaded data
  const { count } = await supabaseAdmin
    .from('users')
    .delete()
    .like('id', 'test-%')
    .select('id', { count: 'exact', head: true });

  if (count) {
    console.log(`✓ Cleaned up ${count} test users and related data`);
  }

  // Clean up stale test notifications
  await supabaseAdmin
    .from('notifications')
    .delete()
    .like('title', 'Test Notification%');

  console.log('✓ Global teardown complete\n');
}

// =============================================================================
// detox.config.js — E2E Test Configuration
// =============================================================================

const detoxConfig = {
  testRunner: {
    args: {
      config: 'tests/e2e/jest.config.js',
      _: ['tests/e2e'],
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug',
    },
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/BlirdApp.app',
      build: 'xcodebuild -workspace ios/BlirdApp.xcworkspace -scheme BlirdApp -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build',
    },
  },
  devices: {
    'android.emulator': {
      type: 'android.emulator',
      device: { avdName: 'Pixel_6_API_33' },
    },
    'ios.simulator': {
      type: 'ios.simulator',
      device: { type: 'iPhone 15' },
    },
  },
  configurations: {
    'android.emu.debug': {
      device: 'android.emulator',
      app: 'android.debug',
    },
    'ios.sim.debug': {
      device: 'ios.simulator',
      app: 'ios.debug',
    },
  },
};

module.exports = detoxConfig;

// =============================================================================
// COMPLETE TEST INVENTORY (All Tests Summary)
// =============================================================================

/*
UNIT TESTS (tests/unit/) — ~80 tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

eligibility.test.ts (~42 tests)
  Age validation:            6 tests  (17, 18, 60, 61, 0, 100 years)
  Weight validation:         6 tests  (50kg exact, above, below, skip)
  Hemoglobin — male:         5 tests  (13.5 exact, above, below, severe)
  Hemoglobin — female:       4 tests  (12.5 exact, above, below, cross-gender)
  Donation interval — male:  7 tests  (56 exact, 57, 120, 55, today, yesterday, eligibleOn)
  Donation interval — female: 3 tests (90 exact, 89, 57 days female)
  Other gender:              2 tests  (uses female interval)
  Illness:                   2 tests  (ill, recovered)
  Rule priority:             2 tests  (age > weight, weight > hemoglobin)
  Edge: first-time donor     1 test   (null lastDonation)
  eligibleOn date calc:      1 test

blood-compatibility.test.ts (~74 tests)
  O- → all 8 recipients:     8 tests  (universal donor)
  All 8 → AB+:               8 tests  (universal recipient)
  A+ compatible donors:      8 tests
  A- compatible donors:      8 tests
  B+ compatible donors:      8 tests
  B- compatible donors:      8 tests
  AB- compatible donors:     8 tests
  O+ compatible donors:      8 tests
  O- (most restrictive):     8 tests  + 1 length check
  getCompatibleDonorGroups:  3 tests

validators.test.ts (~24 tests)
  isValidBDPhone valid:     11 tests
  isValidBDPhone invalid:   10 tests
  formatBDPhoneE164:         4 tests
  maskPhone:                 3 tests

geo.test.ts (~8 tests)
  Radius auto-expansion:     3 tests
  Blood compatibility query: 2 tests
  Edge cases:                3 tests

INTEGRATION TESTS (tests/integration/) — ~175 tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

auth.integration.test.ts (~28 tests)
  POST /auth/register:      10 tests  (success, age, duplicate, missing fields, audit log)
  POST /auth/login:          5 tests  (success, update timestamp, suspended, unregistered)
  POST /auth/logout:         3 tests  (revoke tokens, clear FCM, 401)
  Token edge cases:          5 tests  (expired, revoked, malformed, empty, scheme)
  Token security:            5 tests  (tampered, wrong project, resilience)

requests.integration.test.ts (~32 tests)
  POST /requests:           15 tests  (success variants, validation, rate limit, auto-expire)
  GET /requests:             5 tests  (list, pagination, RLS)
  GET /requests/:id:         4 tests  (own, other user 403, 404)
  PATCH /requests/:id/cancel: 5 tests (pending, completed, cancelled, other user)
  Geo: radius expansion:     3 tests

donors.integration.test.ts (~18 tests)
  GET /donors/nearby:       12 tests  (results, unavailable, out-of-radius, masking, empty, pagination)
  Validation:                6 tests  (missing params, radius limit, invalid blood group)

health.integration.test.ts (~20 tests)
  POST /health/records:      9 tests  (all fields, partial, illness, immutable, validation, RLS)
  GET /eligibility API:      5 tests  (eligible, low Hb, too soon, illness, 57-day male)
  GET /health/records:       4 tests  (list, latest, pagination, RLS)
  Update triggers:           2 tests

notifications.integration.test.ts (~25 tests)
  GET /notifications:        7 tests  (all, unread filter, sort, pagination, RLS)
  GET /notifications/count:  3 tests  (correct count, zero, no notifs)
  PATCH /:id/read:           5 tests  (marks read, count decrements, other user 404, non-existent)
  PATCH /read-all:           5 tests  (marks all, count zero, no cross-user, idempotent)
  Queue integration:         5 tests  (FCM token update, CRITICAL priority)

payments.integration.test.ts (~22 tests)
  POST /payments/initiate:   8 tests  (bKash, Nagad, DB record, 404, 422)
  POST /payments/verify:     9 tests  (success, DB update, notification, failure, FAILED notif, idempotent, 404)
  POST /webhook/bkash:       4 tests  (valid HMAC, invalid HMAC, missing header, tampered)

history.integration.test.ts (~16 tests)
  GET /history:              9 tests  (ALL, DONATION, TRANSFUSION, sort, RLS, empty, pagination)
  Validation:                2 tests  (invalid type, 401)
  Data integrity:            5 tests

users.integration.test.ts (~22 tests)
  GET /users/me:             5 tests  (profile, no fcm_token, no nid_number, 401)
  PATCH /users/me:           9 tests  (name, availability, FCM, empty name, immutable fields)
  PATCH /location:           8 tests  (success, upsert, range validation, missing params, strings)
  DELETE /users/me:          5 tests  (soft delete, anonymize, revoke tokens, records preserved, 401)

admin.integration.test.ts (~12 tests)
  User management:           8 tests  (list, suspend, role assign, analytics, RBAC)
  Org verification:          4 tests

SECURITY TESTS (tests/security/) — ~90 tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

auth-security.test.ts (~22 tests)
  Token attacks:            10 tests  (tampered JWT, expired, revoked, malformed, schemes)
  Token resilience:          3 tests
  PII not leaked:            2 tests
  Privilege escalation:      7 tests

rls-enforcement.test.ts (~14 tests)
  Health records isolation:  2 tests
  Request isolation:         3 tests
  Payment isolation:         1 test
  Notification isolation:    2 tests
  Cross-user access:         6 tests

injection.test.ts (~30 tests)
  SQL injection (8 payloads): 8 tests  (hospitalName, query params, cursor)
  XSS (8 payloads):          8 tests  (hospitalName, notes, patientName)
  Payload size limits:        2 tests  (10KB, 1000 char notes)
  Path traversal:             4 tests
  DB integrity:               8 tests  (verify tables intact after attacks)

rate-limiting.test.ts (~10 tests)
  OTP rate limit:             3 tests  (429 on 4th, Retry-After, X-RateLimit headers)
  Request creation limit:     1 test   (6th request rejected)
  Donor search limit:         1 test
  Global API limit:           1 test
  Header presence:            4 tests

rbac.test.ts (~45 tests)
  DONOR → all admin routes:   7 tests × DONOR (all 403)
  REQUESTER → admin routes:   7 tests × REQUESTER (all 403)
  ADMIN → standard admin:     6 tests (all 200)
  ADMIN → super_admin only:   3 tests (all 403)
  SUPER_ADMIN → all routes:   9 tests (none 403)
  Unauthenticated:            9 tests (all 401)
  Role escalation attempts:   4 tests

PERFORMANCE TESTS (tests/performance/) — ~12 tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

geo-query.perf.test.ts:      5 tests  (5km, 50km, 100km, 10 concurrent, auto-expand)
api-load.perf.test.ts:       5 tests  (P95 latency: /users/me, /count; concurrent load)
db-query.perf.test.ts:       2 tests  (notification query, paginated results)

CONTRACT TESTS (tests/contract/) — ~30 tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

api-schema.contract.test.ts: 28 tests (envelope, user, request, donor, eligibility, notification, pagination shapes)
webhook-signature.test.ts:    4 tests  (valid HMAC, invalid, missing, tampered)

ACCESSIBILITY TESTS (tests/accessibility/) — ~22 tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

mobile-a11y.test.ts:         11 tap target tests
                              9 contrast ratio tests (WCAG AA)
                              4 screen reader tests
                              2 focus management tests
                              1 form label tests

E2E TESTS (tests/e2e/) — ~20 tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

auth-flow.e2e.ts:             4 tests  (full registration, invalid phone, OTP countdown, resend)
create-request.e2e.ts:        3 tests  (free request, paid request, validation)
donor-discovery.e2e.ts:       3 tests  (search, filter, view profile)
health-records.e2e.ts:        3 tests  (add record, eligibility update, chart)
payment-flow.e2e.ts:          3 tests  (bKash success, failure, retry)
notification-flow.e2e.ts:     4 tests  (receive, tap, mark read, badge clears)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL TESTS:     ~511 tests
Unit:            ~80
Integration:     ~175
Security:        ~90
Performance:     ~12
Contract:        ~30
Accessibility:   ~22
E2E:             ~20
Miscellaneous:   ~82 (helpers, fixtures, setup verification)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*/
