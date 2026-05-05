// =============================================================================
// tests/setup/vitest.config.ts
// =============================================================================

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./setup/global.setup.ts'],
    globalSetup: './setup/global.setup.ts',
    teardownTimeout: 30_000,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    coverage: {
      provider: 'c8',
      reporter: ['text', 'lcov', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 80,
        branches: 75,
        functions: 80,
        statements: 80,
      },
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        'tests/**',
        'src/config/**',
        'src/index.ts',
      ],
    },
    reporters: ['verbose', 'html'],
    outputFile: { html: './test-report.html' },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
      '@blird/utils': path.resolve(__dirname, '../../packages/utils/src'),
      '@blird/api-client': path.resolve(__dirname, '../../packages/api-client/src'),
    },
  },
});

// =============================================================================
// tests/setup/global.setup.ts
// =============================================================================

import { vi, beforeAll, afterAll, afterEach } from 'vitest';
import { supabaseAdmin } from '@/config/supabase';

// ── Firebase Admin Mock ───────────────────────────────────────────────────────
// Never call real Firebase in tests — mock entirely
vi.mock('@/config/firebase-admin', () => ({
  firebaseAuth: {
    verifyIdToken: vi.fn().mockResolvedValue({
      uid: 'test-default-uid',
      phone_number: '+8801711111111',
      role: 'DONOR',
      requesterType: undefined,
      orgVerified: false,
    }),
    setCustomUserClaims: vi.fn().mockResolvedValue(undefined),
    revokeRefreshTokens: vi.fn().mockResolvedValue(undefined),
    getUser: vi.fn().mockResolvedValue({ uid: 'test-default-uid' }),
  },
  firebaseMessaging: {
    send: vi.fn().mockResolvedValue('projects/blird/messages/mock-123'),
    sendEachForMulticast: vi.fn().mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      responses: [{ success: true, messageId: 'mock-123' }],
    }),
  },
}));

// ── External Services Mock ────────────────────────────────────────────────────
vi.mock('@/lib/sms', () => ({
  smsService: {
    send: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/jobs/queues', () => ({
  notificationQueue: {
    add: vi.fn().mockResolvedValue({ id: 'job-mock-123', name: 'send-notification' }),
    getJobCounts: vi.fn().mockResolvedValue({ waiting: 0, active: 0, completed: 0 }),
  },
  expiryQueue: {
    add: vi.fn().mockResolvedValue({ id: 'job-mock-456' }),
  },
}));

vi.mock('@/lib/bkash', () => ({
  bkashService: {
    getToken: vi.fn().mockResolvedValue('mock-bkash-token'),
    createPayment: vi.fn().mockResolvedValue({
      bkashURL: 'https://sandbox.bka.sh/payment/checkout/mock-payment-id',
      paymentID: 'mock-payment-id',
      statusCode: '0000',
    }),
    executePayment: vi.fn().mockResolvedValue({
      paymentID: 'mock-payment-id',
      trxID: 'mock-trx-id',
      statusCode: '0000',
      statusMessage: 'Successful',
    }),
    verifyWebhook: vi.fn().mockReturnValue(true),
  },
}));

// ── Global Cleanup ────────────────────────────────────────────────────────────
const TEST_USER_PREFIX = 'test-';

afterEach(() => {
  vi.clearAllMocks(); // reset call counts between tests
});

afterAll(async () => {
  // Clean up any test data that leaked (safety net)
  await supabaseAdmin
    .from('users')
    .delete()
    .like('id', `${TEST_USER_PREFIX}%`);
});

// =============================================================================
// tests/setup/helpers/db.helpers.ts
// =============================================================================

import { supabaseAdmin } from '@/config/supabase';

export interface TestUserOptions {
  role?: 'DONOR' | 'REQUESTER' | 'ADMIN' | 'SUPER_ADMIN';
  bloodGroup?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth?: string;
  isActive?: boolean;
  isAvailable?: boolean;
  isVerified?: boolean;
  trustScore?: number;
  hasDonatedDaysAgo?: number;
  hasHealthRecord?: boolean;
  lat?: number;
  lng?: number;
}

let userCounter = 0;

export async function createTestUser(opts: TestUserOptions = {}) {
  userCounter++;
  const uid = `test-${Date.now()}-${userCounter}`;
  const phone = `+880171${String(userCounter).padStart(7, '0')}`;

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .insert({
      id: uid,
      phone,
      name: `Test User ${userCounter}`,
      date_of_birth: opts.dateOfBirth ?? '1995-06-15',
      gender: opts.gender ?? 'MALE',
      blood_group: opts.bloodGroup ?? 'A_POSITIVE',
      role: opts.role ?? 'DONOR',
      is_active: opts.isActive ?? true,
      is_available: opts.isAvailable ?? true,
      is_verified: opts.isVerified ?? false,
      trust_score: opts.trustScore ?? 50,
    })
    .select()
    .single();

  if (error) throw new Error(`createTestUser failed: ${error.message}`);

  // Create location
  await supabaseAdmin.from('user_locations').insert({
    user_id: uid,
    latitude: opts.lat ?? 23.8103,  // Dhaka default
    longitude: opts.lng ?? 90.4125,
  });

  // Create past donation if hasDonatedDaysAgo specified
  if (opts.hasDonatedDaysAgo !== undefined) {
    const donatedAt = new Date();
    donatedAt.setDate(donatedAt.getDate() - opts.hasDonatedDaysAgo);

    await supabaseAdmin.from('donation_records').insert({
      donor_id: uid,
      recipient_id: uid, // self for test simplicity
      type: 'DONATION',
      blood_group: opts.bloodGroup ?? 'A_POSITIVE',
      units: 1,
      donated_at: donatedAt.toISOString(),
    });
  }

  // Create health record if requested
  if (opts.hasHealthRecord) {
    await supabaseAdmin.from('health_records').insert({
      user_id: uid,
      systolic: 120,
      diastolic: 80,
      hemoglobin: 14.5,
      weight: 68.5,
      has_illness: false,
      medications: [],
    });
  }

  return { user: user!, uid, phone };
}

export async function cleanupUser(uid: string) {
  // Cascade deletes handle related records via FK constraints
  await supabaseAdmin.from('users').delete().eq('id', uid);
}

export async function cleanupUsers(...uids: string[]) {
  await supabaseAdmin.from('users').delete().in('id', uids);
}

export async function createTestRequest(
  requesterId: string,
  overrides: Record<string, unknown> = {}
) {
  const { data, error } = await supabaseAdmin
    .from('blood_requests')
    .insert({
      requester_id: requesterId,
      blood_group: 'A_POSITIVE',
      units_required: 2,
      hospital_name: 'Dhaka Medical College Hospital',
      hospital_address: 'Bakshibazar, Dhaka 1000',
      hospital_lat: 23.7234,
      hospital_lng: 90.3917,
      required_by: new Date(Date.now() + 24 * 3600_000).toISOString(),
      emergency_level: 'URGENT',
      is_for_myself: true,
      payment_method: 'FREE',
      status: 'PENDING',
      expires_at: new Date(Date.now() + 48 * 3600_000).toISOString(),
      ...overrides,
    })
    .select()
    .single();

  if (error) throw new Error(`createTestRequest failed: ${error.message}`);
  return data!;
}

// =============================================================================
// tests/setup/helpers/auth.helpers.ts
// =============================================================================

export function mockFirebaseUser(
  uid: string,
  role: string = 'DONOR',
  phone: string = '+8801711111111',
  extra: Record<string, unknown> = {}
) {
  const { firebaseAuth } = require('@/config/firebase-admin');
  vi.mocked(firebaseAuth.verifyIdToken).mockResolvedValue({
    uid,
    phone_number: phone,
    role,
    ...extra,
  });
}

export function mockFirebaseTokenExpired() {
  const { firebaseAuth } = require('@/config/firebase-admin');
  vi.mocked(firebaseAuth.verifyIdToken).mockRejectedValue(
    Object.assign(new Error('Token expired'), { code: 'auth/id-token-expired' })
  );
}

export function mockFirebaseTokenRevoked() {
  const { firebaseAuth } = require('@/config/firebase-admin');
  vi.mocked(firebaseAuth.verifyIdToken).mockRejectedValue(
    Object.assign(new Error('Token revoked'), { code: 'auth/id-token-revoked' })
  );
}

export function mockFirebaseTokenInvalid() {
  const { firebaseAuth } = require('@/config/firebase-admin');
  vi.mocked(firebaseAuth.verifyIdToken).mockRejectedValue(
    Object.assign(new Error('Invalid token'), { code: 'auth/argument-error' })
  );
}

// =============================================================================
// tests/setup/helpers/request.helpers.ts
// HTTP request factory with common patterns
// =============================================================================

import supertest from 'supertest';
import { createApp } from '@/app';

const app = createApp();
export const api = supertest(app);

export function authHeader(token = 'mock-token') {
  return { Authorization: `Bearer ${token}` };
}

export async function authenticatedPost(
  path: string,
  body: unknown,
  token = 'mock-token'
) {
  return api.post(path).set(authHeader(token)).send(body);
}

export async function authenticatedGet(
  path: string,
  query: Record<string, string> = {},
  token = 'mock-token'
) {
  return api.get(path).set(authHeader(token)).query(query);
}

export async function authenticatedPatch(
  path: string,
  body: unknown,
  token = 'mock-token'
) {
  return api.patch(path).set(authHeader(token)).send(body);
}

// =============================================================================
// tests/setup/helpers/fixtures/users.fixtures.ts
// =============================================================================

export const VALID_REGISTER_DTO = {
  idToken: 'mock-firebase-token',
  name: 'Rahim Uddin',
  dateOfBirth: '1995-06-15',
  gender: 'MALE',
  bloodGroup: 'A_POSITIVE',
  location: {
    latitude: 23.8103,
    longitude: 90.4125,
    division: 'Dhaka',
    district: 'Dhaka',
    upazila: 'Mirpur',
  },
};

export const VALID_REQUEST_DTO = {
  bloodGroup: 'A_POSITIVE',
  unitsRequired: 2,
  hospitalName: 'Dhaka Medical College Hospital',
  hospitalAddress: 'Bakshibazar, Dhaka 1000',
  hospitalLat: 23.7234,
  hospitalLng: 90.3917,
  requiredBy: new Date(Date.now() + 24 * 3600_000).toISOString(),
  emergencyLevel: 'URGENT',
  isForMyself: true,
  paymentMethod: 'FREE',
};

export const VALID_HEALTH_RECORD_DTO = {
  systolic: 120,
  diastolic: 80,
  hemoglobin: 14.5,
  weight: 68.5,
  hasIllness: false,
  medications: [],
};
