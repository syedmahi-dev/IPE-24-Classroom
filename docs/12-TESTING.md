# 12 — TESTING
**Blird | Vitest, Supertest, Detox — Unit, Integration, E2E**

---

## AGENT RULES FOR TESTING

```
1. MINIMUM 80% code coverage — CI fails below this threshold
2. EVERY API endpoint must have at least one integration test
3. Integration tests run against a REAL Supabase test project — no mocks for DB
4. Firebase Auth is mocked in tests — never call real Firebase in CI
5. ZERO failing tests to merge to main — no exceptions
6. Test file naming: <module>.unit.test.ts | <module>.integration.test.ts
7. E2E tests (Detox) cover: auth flow, create request, payment flow
8. Always test: happy path + validation errors + auth errors + rate limits
```

---

## TEST STACK

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit | Vitest + vi.mock | Pure function logic, service methods with mocked repos |
| Integration | Vitest + Supertest | Full HTTP request → Supabase test DB → response |
| E2E Mobile | Detox | Full user flows on real device/emulator |
| Coverage | Vitest --coverage (c8) | Track line/branch/function coverage |
| Mocking | msw + vi.mock | Firebase Admin, external APIs |

---

## TEST CONFIGURATION

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'c8',
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80,
      },
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        'tests/**',
        '**/__mocks__/**',
        'src/config/**',  // env vars — not testable
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@blird/utils': path.resolve(__dirname, '../../packages/utils/src'),
    },
  },
});
```

```typescript
// tests/setup.ts
import { vi, beforeAll, afterAll, afterEach } from 'vitest';

// Mock Firebase Admin — never call real Firebase in tests
vi.mock('@/config/firebase-admin', () => ({
  firebaseAuth: {
    verifyIdToken: vi.fn().mockResolvedValue({
      uid: 'test-donor-uid-001',
      phone_number: '+8801711111111',
      role: 'DONOR',
    }),
    setCustomUserClaims: vi.fn().mockResolvedValue(undefined),
    revokeRefreshTokens: vi.fn().mockResolvedValue(undefined),
  },
  firebaseMessaging: {
    send: vi.fn().mockResolvedValue('message-id-123'),
    sendEachForMulticast: vi.fn().mockResolvedValue({ successCount: 1, failureCount: 0 }),
  },
}));

// Mock SMS — never send real SMS in tests
vi.mock('@/lib/sms', () => ({
  smsService: {
    send: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock BullMQ — don't process jobs in tests
vi.mock('@/jobs/queues', () => ({
  notificationQueue: {
    add: vi.fn().mockResolvedValue({ id: 'job-123' }),
  },
  expiryQueue: {
    add: vi.fn().mockResolvedValue({ id: 'job-456' }),
  },
}));

// Real Supabase test project (set in CI environment)
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY point to test project
```

---

## TEST HELPERS

```typescript
// tests/helpers/index.ts
import { supabaseAdmin } from '@/config/supabase';
import jwt from 'jsonwebtoken';

/**
 * Create a test user in the Supabase test DB
 * Returns the created user + a valid mock Firebase token
 */
export async function createTestUser(overrides: Partial<TestUser> = {}): Promise<TestUserResult> {
  const userId = `test-user-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const defaults = {
    id: userId,
    phone: `+880171${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
    name: 'Test User',
    date_of_birth: '1995-06-15',
    gender: 'MALE' as const,
    blood_group: 'A_POSITIVE' as const,
    role: 'DONOR' as const,
    is_active: true,
    is_available: true,
    trust_score: 50,
  };

  const userData = { ...defaults, ...overrides };

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .insert(userData)
    .select()
    .single();

  if (error) throw new Error(`Failed to create test user: ${error.message}`);

  // Also create a location for geo tests
  await supabaseAdmin.from('user_locations').insert({
    user_id: userId,
    latitude: 23.8103,   // Dhaka
    longitude: 90.4125,
  });

  return { user: user!, token: createMockToken(userId, userData.role) };
}

/**
 * Create a mock Firebase token for test requests
 * This is intercepted by the mocked firebaseAuth.verifyIdToken
 */
export function createMockToken(userId: string, role = 'DONOR'): string {
  // The actual token value doesn't matter — firebaseAuth is mocked
  // The mock returns uid: 'test-donor-uid-001' regardless
  // For multi-user tests, configure the mock per-test
  return `mock-token-${userId}`;
}

/**
 * Configure Firebase mock for a specific user
 */
export function mockFirebaseUser(userId: string, role = 'DONOR', phone = '+8801711111111') {
  const { firebaseAuth } = require('@/config/firebase-admin');
  vi.mocked(firebaseAuth.verifyIdToken).mockResolvedValue({
    uid: userId,
    phone_number: phone,
    role,
  });
}

/**
 * Clean up test data after each test
 * Cascades through foreign keys automatically
 */
export async function cleanupTestUser(userId: string) {
  await supabaseAdmin.from('users').delete().eq('id', userId);
}
```

---

## UNIT TESTS

```typescript
// modules/auth/__tests__/auth.service.unit.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '../auth.service';
import { AppError } from '@/lib/errors';

// Mock all dependencies
vi.mock('@/config/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  },
}));

describe('authService.register', () => {
  it('throws AGE_INVALID when user is under 18', async () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 17);

    await expect(
      authService.register('valid-id-token', {
        name: 'Test User',
        dateOfBirth: dob.toISOString().split('T')[0],
        gender: 'MALE',
        bloodGroup: 'A_POSITIVE',
      }, '127.0.0.1')
    ).rejects.toThrow(expect.objectContaining({
      code: 'AGE_INVALID',
      statusCode: 400,
    }));
  });

  it('throws AGE_INVALID when user is over 60', async () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 61);

    await expect(
      authService.register('valid-id-token', {
        name: 'Test User',
        dateOfBirth: dob.toISOString().split('T')[0],
        gender: 'MALE',
        bloodGroup: 'A_POSITIVE',
      }, '127.0.0.1')
    ).rejects.toThrow(expect.objectContaining({ code: 'AGE_INVALID' }));
  });
});

// modules/geo/__tests__/eligibility.unit.test.ts
import { describe, it, expect } from 'vitest';
import { calculateEligibility } from '@blird/utils/eligibility';

describe('calculateEligibility', () => {
  const validUser = {
    dateOfBirth: new Date('1995-06-15'),
    gender: 'MALE' as const,
    latestWeight: 70,
    latestHemoglobin: 14.5,
    hasCurrentIllness: false,
  };

  it('returns eligible: true for a healthy eligible donor', () => {
    const result = calculateEligibility(validUser, null);
    expect(result.eligible).toBe(true);
  });

  it('returns AGE_OUT_OF_RANGE for user under 18', () => {
    const youngUser = {
      ...validUser,
      dateOfBirth: new Date(Date.now() - 17 * 365 * 24 * 60 * 60 * 1000),
    };
    const result = calculateEligibility(youngUser, null);
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('AGE_OUT_OF_RANGE');
  });

  it('returns WEIGHT_TOO_LOW when weight is under 50kg', () => {
    const result = calculateEligibility({ ...validUser, latestWeight: 45 }, null);
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('WEIGHT_TOO_LOW');
  });

  it('returns LOW_HEMOGLOBIN for male with Hb < 13.5', () => {
    const result = calculateEligibility({ ...validUser, latestHemoglobin: 12.0 }, null);
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('LOW_HEMOGLOBIN');
  });

  it('female min hemoglobin is 12.5 (not 13.5)', () => {
    const femaleUser = { ...validUser, gender: 'FEMALE' as const, latestHemoglobin: 13.0 };
    const result = calculateEligibility(femaleUser, null);
    expect(result.eligible).toBe(true); // 13.0 >= 12.5 for female
  });

  it('returns TOO_SOON for male who donated 30 days ago', () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = calculateEligibility(validUser, thirtyDaysAgo);
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('TOO_SOON');
    expect(result.eligibleOn).toBeDefined();
  });

  it('returns TOO_SOON for female who donated 80 days ago (needs 90)', () => {
    const femaleUser = { ...validUser, gender: 'FEMALE' as const };
    const eightyDaysAgo = new Date(Date.now() - 80 * 24 * 60 * 60 * 1000);
    const result = calculateEligibility(femaleUser, eightyDaysAgo);
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('TOO_SOON');
  });

  it('male is eligible after 56 days', () => {
    const fiftySevenDaysAgo = new Date(Date.now() - 57 * 24 * 60 * 60 * 1000);
    const result = calculateEligibility(validUser, fiftySevenDaysAgo);
    expect(result.eligible).toBe(true);
  });

  it('returns CURRENT_ILLNESS when user is sick', () => {
    const result = calculateEligibility({ ...validUser, hasCurrentIllness: true }, null);
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('CURRENT_ILLNESS');
  });
});
```

---

## INTEGRATION TESTS

```typescript
// modules/requests/__tests__/requests.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import supertest from 'supertest';
import { createApp } from '@/app';
import { createTestUser, cleanupTestUser, mockFirebaseUser } from 'tests/helpers';

const app = createApp();
const request = supertest(app);

describe('POST /v1/requests', () => {
  let donorId: string;
  let authToken: string;

  beforeEach(async () => {
    const { user, token } = await createTestUser({
      blood_group: 'A_POSITIVE',
      is_active: true,
    });
    donorId = user.id;
    authToken = token;
    mockFirebaseUser(donorId, 'DONOR');
  });

  afterEach(async () => {
    await cleanupTestUser(donorId);
  });

  it('creates a free blood request successfully', async () => {
    const res = await request
      .post('/v1/requests')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        bloodGroup: 'A_POSITIVE',
        unitsRequired: 2,
        hospitalName: 'Dhaka Medical College Hospital',
        hospitalAddress: 'Bakshibazar, Dhaka 1000',
        hospitalLat: 23.7234,
        hospitalLng: 90.3917,
        requiredBy: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        emergencyLevel: 'URGENT',
        isForMyself: true,
        paymentMethod: 'FREE',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.request.status).toBe('PENDING');
    expect(res.body.data.request.blood_group).toBe('A_POSITIVE');
    expect(res.body.data.request.expires_at).toBeDefined();
  });

  it('creates a paid request for a patient', async () => {
    const res = await request
      .post('/v1/requests')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        bloodGroup: 'B_POSITIVE',
        unitsRequired: 1,
        hospitalName: 'Square Hospital',
        hospitalAddress: 'Panthapath, Dhaka',
        requiredBy: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        emergencyLevel: 'CRITICAL',
        isForMyself: false,
        patientName: 'Karim Ahmed',
        patientAge: 45,
        patientRelation: 'Father',
        paymentMethod: 'BKASH',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.request.patient_name).toBe('Karim Ahmed');
    expect(res.body.data.request.emergency_level).toBe('CRITICAL');
  });

  it('returns 400 when isForMyself=false but patient fields missing', async () => {
    const res = await request
      .post('/v1/requests')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        bloodGroup: 'O_NEGATIVE',
        unitsRequired: 1,
        hospitalName: 'Test Hospital',
        hospitalAddress: 'Test Address',
        requiredBy: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        isForMyself: false,
        // missing patientName and patientAge
        paymentMethod: 'FREE',
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 without auth token', async () => {
    const res = await request.post('/v1/requests').send({});
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 422 for units out of range', async () => {
    const res = await request
      .post('/v1/requests')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ ...validPayload, unitsRequired: 11 });

    expect(res.status).toBe(422);
  });

  it('returns 422 for past requiredBy date', async () => {
    const res = await request
      .post('/v1/requests')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ ...validPayload, requiredBy: new Date(Date.now() - 3600000).toISOString() });

    expect(res.status).toBe(422);
  });

  it('enforces rate limit after 5 requests', async () => {
    for (let i = 0; i < 5; i++) {
      await request
        .post('/v1/requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validPayload);
    }

    const res = await request
      .post('/v1/requests')
      .set('Authorization', `Bearer ${authToken}`)
      .send(validPayload);

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
    expect(res.headers['retry-after']).toBeDefined();
  });
});

// Reusable valid payload
const validPayload = {
  bloodGroup: 'A_POSITIVE',
  unitsRequired: 1,
  hospitalName: 'Test Hospital',
  hospitalAddress: 'Test Address',
  requiredBy: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  emergencyLevel: 'NORMAL',
  isForMyself: true,
  paymentMethod: 'FREE',
};
```

---

## AUTH INTEGRATION TESTS

```typescript
// modules/auth/__tests__/auth.integration.test.ts
import { describe, it, expect, afterEach, vi } from 'vitest';
import supertest from 'supertest';
import { createApp } from '@/app';
import { supabaseAdmin } from '@/config/supabase';

const app = createApp();
const request = supertest(app);
const TEST_UID = 'integration-test-uid-register';

afterEach(async () => {
  await supabaseAdmin.from('users').delete().eq('id', TEST_UID);
  await supabaseAdmin.from('user_locations').delete().eq('user_id', TEST_UID);
});

describe('POST /v1/auth/register', () => {
  it('creates a new user from Firebase ID token', async () => {
    const { firebaseAuth } = await import('@/config/firebase-admin');
    vi.mocked(firebaseAuth.verifyIdToken).mockResolvedValueOnce({
      uid: TEST_UID,
      phone_number: '+8801799999999',
    } as any);

    const res = await request
      .post('/v1/auth/register')
      .send({
        idToken: 'mock-firebase-token',
        name: 'Integration Test User',
        dateOfBirth: '1995-01-15',
        gender: 'MALE',
        bloodGroup: 'O_POSITIVE',
        location: {
          latitude: 23.8103,
          longitude: 90.4125,
          division: 'Dhaka',
          district: 'Dhaka',
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.id).toBe(TEST_UID);
    expect(res.body.data.user.blood_group).toBe('O_POSITIVE');
    expect(res.body.data.user.role).toBe('DONOR');

    // Verify in DB
    const { data: dbUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', TEST_UID)
      .single();
    expect(dbUser).toBeTruthy();
    expect(dbUser!.phone).toBe('+8801799999999');
  });

  it('returns 409 for duplicate phone number', async () => {
    // First registration
    await supabaseAdmin.from('users').insert({
      id: TEST_UID,
      phone: '+8801799999999',
      name: 'Existing User',
      date_of_birth: '1995-01-15',
      gender: 'MALE',
      blood_group: 'A_POSITIVE',
    });

    const { firebaseAuth } = await import('@/config/firebase-admin');
    vi.mocked(firebaseAuth.verifyIdToken).mockResolvedValueOnce({
      uid: TEST_UID,
      phone_number: '+8801799999999',
    } as any);

    const res = await request
      .post('/v1/auth/register')
      .send({
        idToken: 'mock-token',
        name: 'Duplicate User',
        dateOfBirth: '1995-01-15',
        gender: 'MALE',
        bloodGroup: 'B_POSITIVE',
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_REGISTERED');
  });

  it('returns 400 for underage registration (17 years)', async () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 17);

    const { firebaseAuth } = await import('@/config/firebase-admin');
    vi.mocked(firebaseAuth.verifyIdToken).mockResolvedValueOnce({
      uid: TEST_UID,
      phone_number: '+8801799999998',
    } as any);

    const res = await request.post('/v1/auth/register').send({
      idToken: 'mock-token',
      name: 'Young User',
      dateOfBirth: dob.toISOString().split('T')[0],
      gender: 'MALE',
      bloodGroup: 'A_POSITIVE',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('AGE_INVALID');
  });
});
```

---

## DONOR DISCOVERY INTEGRATION TESTS

```typescript
// modules/donors/__tests__/donors.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { createApp } from '@/app';
import { createTestUser, cleanupTestUser, mockFirebaseUser } from 'tests/helpers';
import { supabaseAdmin } from '@/config/supabase';

const app = createApp();
const request = supertest(app);

let requesterId: string;
let requesterToken: string;
let donorId: string;

beforeAll(async () => {
  // Create requester near Dhaka
  const req = await createTestUser({
    blood_group: 'A_POSITIVE',
    is_active: true,
  });
  requesterId = req.user.id;
  requesterToken = req.token;

  // Create available A+ donor near Dhaka
  const donor = await createTestUser({
    blood_group: 'A_POSITIVE',
    is_available: true,
    gender: 'MALE',
    date_of_birth: '1990-01-01',
  });
  donorId = donor.user.id;
});

afterAll(async () => {
  await cleanupTestUser(requesterId);
  await cleanupTestUser(donorId);
});

describe('GET /v1/donors/nearby', () => {
  it('returns nearby A+ donors within 10km of Dhaka', async () => {
    mockFirebaseUser(requesterId);

    const res = await request
      .get('/v1/donors/nearby')
      .set('Authorization', `Bearer ${requesterToken}`)
      .query({
        bloodGroup: 'A_POSITIVE',
        lat: 23.8103,
        lng: 90.4125,
        radius: 10,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.donors)).toBe(true);

    // Names should be masked
    for (const donor of res.body.data.donors) {
      expect(donor.name).toMatch(/\*{3}/); // contains *** masking
    }
  });

  it('returns 422 for missing bloodGroup parameter', async () => {
    mockFirebaseUser(requesterId);

    const res = await request
      .get('/v1/donors/nearby')
      .set('Authorization', `Bearer ${requesterToken}`)
      .query({ lat: 23.8103, lng: 90.4125 }); // missing bloodGroup

    expect(res.status).toBe(422);
  });

  it('returns 422 for radius exceeding 100km', async () => {
    mockFirebaseUser(requesterId);

    const res = await request
      .get('/v1/donors/nearby')
      .set('Authorization', `Bearer ${requesterToken}`)
      .query({ bloodGroup: 'A_POSITIVE', lat: 23.8103, lng: 90.4125, radius: 150 });

    expect(res.status).toBe(422);
  });

  it('returns empty array (not 404) when no donors found', async () => {
    mockFirebaseUser(requesterId);

    const res = await request
      .get('/v1/donors/nearby')
      .set('Authorization', `Bearer ${requesterToken}`)
      .query({
        bloodGroup: 'AB_NEGATIVE', // rare blood type
        lat: 25.0,                  // remote location
        lng: 89.0,
        radius: 1,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.donors).toHaveLength(0);
  });
});
```

---

## E2E TESTS (DETOX)

```typescript
// e2e/flows/auth.e2e.ts
import { device, element, by, expect as detoxExpect } from 'detox';

describe('Registration Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, delete: true });
  });

  it('completes phone OTP registration', async () => {
    // Onboarding
    await detoxExpect(element(by.text('জীবন দান করুন'))).toBeVisible();
    await element(by.text('শুরু করা যাক')).tap();

    // Phone input
    await element(by.id('phone-input')).typeText('01711111111');
    await element(by.text('ওটিপি পাঠান')).tap();

    // OTP (use Firebase test phone + code)
    await element(by.id('otp-box-0')).typeText('1');
    await element(by.id('otp-box-1')).typeText('2');
    await element(by.id('otp-box-2')).typeText('3');
    await element(by.id('otp-box-3')).typeText('4');
    await element(by.id('otp-box-4')).typeText('5');
    await element(by.id('otp-box-5')).typeText('6');

    // Personal info
    await detoxExpect(element(by.text('আপনার তথ্য দিন'))).toBeVisible();
    await element(by.id('name-input')).typeText('Test User');
    await element(by.text('পুরুষ')).tap();
    await element(by.text('A+')).tap();
    await element(by.text('পরবর্তী')).tap();

    // Location
    await element(by.text('বর্তমান অবস্থান ব্যবহার করুন')).tap();
    await element(by.text('পরবর্তী')).tap();

    // Photo — skip
    await element(by.text('এড়িয়ে যান')).tap();

    // Success
    await detoxExpect(element(by.text('স্বাগতম'))).toBeVisible();
  });
});

// e2e/flows/createRequest.e2e.ts
describe('Create Blood Request Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await loginAsTestUser(); // helper that logs in with Firebase test phone
  });

  it('creates a free urgent blood request', async () => {
    await element(by.text('রক্তের অনুরোধ করুন')).tap();

    // Step 1: Recipient
    await element(by.text('নিজের জন্য')).tap();

    // Step 2: Type
    await element(by.text('বিনামূল্যে')).tap();

    // Step 3: Details
    await element(by.text('B+')).tap(); // blood group
    await element(by.id('units-plus')).tap(); // increment to 2
    await element(by.id('hospital-name')).typeText('Dhaka Medical College');
    await element(by.id('hospital-address')).typeText('Bakshibazar, Dhaka');
    await element(by.text('⚠️ জরুরি')).tap(); // urgency level
    await element(by.text('পরবর্তী')).tap();

    // Success screen
    await detoxExpect(element(by.text('অনুরোধ পাঠানো হয়েছে'))).toBeVisible();
    await detoxExpect(element(by.text('হোমে ফিরুন'))).toBeVisible();
  });
});
```

---

## PACKAGE.JSON TEST SCRIPTS

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ci": "vitest run --coverage --reporter=verbose",
    "test:unit": "vitest run src/**/*.unit.test.ts",
    "test:integration": "vitest run src/**/*.integration.test.ts",
    "test:e2e:android": "detox test --configuration android.emu.debug",
    "test:e2e:ios": "detox test --configuration ios.sim.debug"
  }
}
```
