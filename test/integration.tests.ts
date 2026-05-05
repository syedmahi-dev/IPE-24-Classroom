// =============================================================================
// tests/integration/auth.integration.test.ts
// =============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { api, authHeader } from '../setup/helpers/request.helpers';
import { createTestUser, cleanupUser } from '../setup/helpers/db.helpers';
import { mockFirebaseUser, mockFirebaseTokenExpired, mockFirebaseTokenRevoked } from '../setup/helpers/auth.helpers';
import { VALID_REGISTER_DTO } from '../setup/helpers/fixtures/users.fixtures';
import { supabaseAdmin } from '@/config/supabase';

describe('POST /v1/auth/register', () => {
  const TEST_UID = 'test-register-uid-001';

  beforeEach(() => {
    const { firebaseAuth } = require('@/config/firebase-admin');
    vi.mocked(firebaseAuth.verifyIdToken).mockResolvedValue({
      uid: TEST_UID,
      phone_number: '+8801799999001',
    });
  });

  afterEach(async () => {
    await cleanupUser(TEST_UID);
  });

  it('201: creates a new DONOR account from Firebase phone token', async () => {
    const res = await api.post('/v1/auth/register').send(VALID_REGISTER_DTO);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.id).toBe(TEST_UID);
    expect(res.body.data.user.role).toBe('DONOR');
    expect(res.body.data.user.blood_group).toBe('A_POSITIVE');
    expect(res.body.data.user.is_active).toBe(true);
    expect(res.body.data.user.phone).toBe('+8801799999001');
  });

  it('201: creates user_locations record with PostGIS geom', async () => {
    await api.post('/v1/auth/register').send(VALID_REGISTER_DTO);

    const { data: location } = await supabaseAdmin
      .from('user_locations')
      .select('*')
      .eq('user_id', TEST_UID)
      .single();

    expect(location).not.toBeNull();
    expect(Number(location!.latitude)).toBeCloseTo(23.8103, 3);
    expect(Number(location!.longitude)).toBeCloseTo(90.4125, 3);
    expect(location!.geom).toBeDefined(); // DB trigger auto-created geom
  });

  it('201: sets Firebase custom claims to DONOR role', async () => {
    await api.post('/v1/auth/register').send(VALID_REGISTER_DTO);

    const { firebaseAuth } = require('@/config/firebase-admin');
    expect(vi.mocked(firebaseAuth.setCustomUserClaims))
      .toHaveBeenCalledWith(TEST_UID, { role: 'DONOR' });
  });

  it('400: rejects user aged 17 (underage)', async () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 17);
    dob.setDate(dob.getDate() + 1);

    const res = await api.post('/v1/auth/register').send({
      ...VALID_REGISTER_DTO,
      dateOfBirth: dob.toISOString().split('T')[0],
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('AGE_INVALID');
  });

  it('400: rejects user aged 61 (over maximum)', async () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 61);

    const res = await api.post('/v1/auth/register').send({
      ...VALID_REGISTER_DTO,
      dateOfBirth: dob.toISOString().split('T')[0],
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('AGE_INVALID');
  });

  it('409: rejects registration when Firebase UID already exists in Supabase', async () => {
    // First registration
    await api.post('/v1/auth/register').send(VALID_REGISTER_DTO);

    // Attempt duplicate
    const res = await api.post('/v1/auth/register').send(VALID_REGISTER_DTO);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_REGISTERED');
  });

  it('422: missing required field — name', async () => {
    const { name: _, ...withoutName } = VALID_REGISTER_DTO;
    const res = await api.post('/v1/auth/register').send(withoutName);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toHaveProperty('name');
  });

  it('422: invalid blood group value', async () => {
    const res = await api.post('/v1/auth/register').send({
      ...VALID_REGISTER_DTO,
      bloodGroup: 'INVALID_TYPE',
    });
    expect(res.status).toBe(422);
  });

  it('422: invalid gender value', async () => {
    const res = await api.post('/v1/auth/register').send({
      ...VALID_REGISTER_DTO,
      gender: 'UNKNOWN',
    });
    expect(res.status).toBe(422);
  });

  it('writes to audit_logs on successful registration', async () => {
    await api.post('/v1/auth/register').send(VALID_REGISTER_DTO);

    const { data: log } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('user_id', TEST_UID)
      .eq('action', 'USER_REGISTERED')
      .single();

    expect(log).not.toBeNull();
    expect(log!.entity).toBe('users');
  });
});

describe('POST /v1/auth/login', () => {
  let uid: string;

  beforeEach(async () => {
    const { user } = await createTestUser({ isActive: true });
    uid = user.id;
    mockFirebaseUser(uid, 'DONOR', user.phone!);
  });

  afterEach(async () => { await cleanupUser(uid); });

  it('200: returns user profile for existing user', async () => {
    const res = await api.post('/v1/auth/login').send({ idToken: 'mock-token' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(uid);
    expect(res.body.data.user.role).toBe('DONOR');
  });

  it('200: updates last_active_at timestamp on login', async () => {
    const before = new Date();
    await api.post('/v1/auth/login').send({ idToken: 'mock-token' });

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('last_active_at')
      .eq('id', uid)
      .single();

    expect(new Date(user!.last_active_at!).getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it('403: rejects login for suspended user (is_active = false)', async () => {
    await supabaseAdmin.from('users').update({ is_active: false }).eq('id', uid);

    const res = await api.post('/v1/auth/login').send({ idToken: 'mock-token' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_INACTIVE');
  });

  it('404: rejects login for unregistered Firebase UID', async () => {
    const { firebaseAuth } = require('@/config/firebase-admin');
    vi.mocked(firebaseAuth.verifyIdToken).mockResolvedValueOnce({
      uid: 'completely-unknown-uid-xyz',
      phone_number: '+8801799998888',
    });

    const res = await api.post('/v1/auth/login').send({ idToken: 'mock-token' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_REGISTERED');
  });
});

describe('POST /v1/auth/logout', () => {
  let uid: string;

  beforeEach(async () => {
    const { user } = await createTestUser();
    uid = user.id;
    mockFirebaseUser(uid);
  });

  afterEach(async () => { await cleanupUser(uid); });

  it('200: revokes Firebase refresh tokens on logout', async () => {
    const res = await api.post('/v1/auth/logout').set(authHeader());

    expect(res.status).toBe(200);
    const { firebaseAuth } = require('@/config/firebase-admin');
    expect(vi.mocked(firebaseAuth.revokeRefreshTokens)).toHaveBeenCalledWith(uid);
  });

  it('200: clears FCM token from user record on logout', async () => {
    // First set an FCM token
    await supabaseAdmin.from('users').update({ fcm_token: 'test-fcm-token' }).eq('id', uid);

    await api.post('/v1/auth/logout').set(authHeader());

    const { data: user } = await supabaseAdmin
      .from('users').select('fcm_token').eq('id', uid).single();

    expect(user!.fcm_token).toBeNull();
  });

  it('401: returns unauthorized without token', async () => {
    const res = await api.post('/v1/auth/logout');
    expect(res.status).toBe(401);
  });
});

describe('Auth Token Edge Cases', () => {
  it('401: returns TOKEN_EXPIRED for expired Firebase token', async () => {
    mockFirebaseTokenExpired();
    const res = await api.get('/v1/users/me').set(authHeader('expired-token'));
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('401: returns TOKEN_REVOKED for revoked session', async () => {
    mockFirebaseTokenRevoked();
    const res = await api.get('/v1/users/me').set(authHeader('revoked-token'));
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_REVOKED');
  });

  it('401: returns UNAUTHORIZED for malformed token', async () => {
    const res = await api.get('/v1/users/me').set({ Authorization: 'NotBearer token' });
    expect(res.status).toBe(401);
  });

  it('401: returns UNAUTHORIZED for missing auth header', async () => {
    const res = await api.get('/v1/users/me');
    expect(res.status).toBe(401);
  });

  it('401: returns UNAUTHORIZED for empty Bearer token', async () => {
    const res = await api.get('/v1/users/me').set({ Authorization: 'Bearer ' });
    expect(res.status).toBe(401);
  });
});

// =============================================================================
// tests/integration/requests.integration.test.ts
// =============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { api, authHeader } from '../setup/helpers/request.helpers';
import { createTestUser, cleanupUser, cleanupUsers, createTestRequest } from '../setup/helpers/db.helpers';
import { mockFirebaseUser } from '../setup/helpers/auth.helpers';
import { VALID_REQUEST_DTO } from '../setup/helpers/fixtures/users.fixtures';
import { supabaseAdmin } from '@/config/supabase';

describe('POST /v1/requests — Create Blood Request', () => {
  let uid: string;

  beforeEach(async () => {
    const { user } = await createTestUser({ isActive: true, lat: 23.8103, lng: 90.4125 });
    uid = user.id;
    mockFirebaseUser(uid, 'DONOR');
  });

  afterEach(async () => { await cleanupUser(uid); });

  it('201: creates a free blood request with all required fields', async () => {
    const res = await api.post('/v1/requests').set(authHeader()).send(VALID_REQUEST_DTO);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.request.status).toBe('PENDING');
    expect(res.body.data.request.blood_group).toBe('A_POSITIVE');
    expect(res.body.data.request.units_required).toBe(2);
    expect(res.body.data.request.payment_method).toBe('FREE');
    expect(res.body.data.request.requester_id).toBe(uid);
  });

  it('201: expires_at is exactly 48 hours from creation', async () => {
    const before = new Date();
    const res = await api.post('/v1/requests').set(authHeader()).send(VALID_REQUEST_DTO);

    const expiresAt = new Date(res.body.data.request.expires_at);
    const diffHours = (expiresAt.getTime() - before.getTime()) / 3600_000;

    expect(diffHours).toBeGreaterThanOrEqual(47.9);
    expect(diffHours).toBeLessThanOrEqual(48.1);
  });

  it('201: sets hospital_geom from lat/lng (PostGIS trigger)', async () => {
    const res = await api.post('/v1/requests').set(authHeader()).send(VALID_REQUEST_DTO);
    const reqId = res.body.data.request.id;

    const { data: req } = await supabaseAdmin
      .from('blood_requests').select('hospital_geom').eq('id', reqId).single();

    expect(req!.hospital_geom).toBeDefined();
  });

  it('201: creates CRITICAL request and queues SMS notifications', async () => {
    const { notificationQueue } = require('@/jobs/queues');
    const res = await api.post('/v1/requests').set(authHeader()).send({
      ...VALID_REQUEST_DTO,
      emergencyLevel: 'CRITICAL',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.request.emergency_level).toBe('CRITICAL');
    // Notification queue should be called for nearby donors
    expect(vi.mocked(notificationQueue.add)).toHaveBeenCalled();
  });

  it('201: creates request for patient with all patient fields', async () => {
    const res = await api.post('/v1/requests').set(authHeader()).send({
      ...VALID_REQUEST_DTO,
      isForMyself: false,
      patientName: 'Karim Ahmed',
      patientAge: 45,
      patientRelation: 'Father',
      doctorName: 'Dr. Rahman',
      wardNumber: 'Ward 5, Bed 12',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.request.patient_name).toBe('Karim Ahmed');
    expect(res.body.data.request.patient_age).toBe(45);
    expect(res.body.data.request.patient_relation).toBe('Father');
    expect(res.body.data.request.doctor_name).toBe('Dr. Rahman');
    expect(res.body.data.request.ward_number).toBe('Ward 5, Bed 12');
  });

  it('400: rejects when user has no location set', async () => {
    // Remove location
    await supabaseAdmin.from('user_locations').delete().eq('user_id', uid);

    const res = await api.post('/v1/requests').set(authHeader()).send(VALID_REQUEST_DTO);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('LOCATION_REQUIRED');
  });

  it('422: rejects isForMyself=false without patientName', async () => {
    const res = await api.post('/v1/requests').set(authHeader()).send({
      ...VALID_REQUEST_DTO,
      isForMyself: false,
      // missing patientName and patientAge
    });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('422: rejects isForMyself=false without patientAge', async () => {
    const res = await api.post('/v1/requests').set(authHeader()).send({
      ...VALID_REQUEST_DTO,
      isForMyself: false,
      patientName: 'Karim Ahmed',
      // missing patientAge
    });
    expect(res.status).toBe(422);
  });

  it('422: rejects unitsRequired > 10', async () => {
    const res = await api.post('/v1/requests').set(authHeader()).send({
      ...VALID_REQUEST_DTO, unitsRequired: 11,
    });
    expect(res.status).toBe(422);
  });

  it('422: rejects unitsRequired < 1 (zero)', async () => {
    const res = await api.post('/v1/requests').set(authHeader()).send({
      ...VALID_REQUEST_DTO, unitsRequired: 0,
    });
    expect(res.status).toBe(422);
  });

  it('422: rejects requiredBy in the past', async () => {
    const res = await api.post('/v1/requests').set(authHeader()).send({
      ...VALID_REQUEST_DTO,
      requiredBy: new Date(Date.now() - 3600_000).toISOString(),
    });
    expect(res.status).toBe(422);
  });

  it('422: rejects invalid blood group', async () => {
    const res = await api.post('/v1/requests').set(authHeader()).send({
      ...VALID_REQUEST_DTO, bloodGroup: 'C_POSITIVE',
    });
    expect(res.status).toBe(422);
  });

  it('422: rejects invalid emergency level', async () => {
    const res = await api.post('/v1/requests').set(authHeader()).send({
      ...VALID_REQUEST_DTO, emergencyLevel: 'SUPER_URGENT',
    });
    expect(res.status).toBe(422);
  });

  it('422: rejects hospitalName shorter than 2 characters', async () => {
    const res = await api.post('/v1/requests').set(authHeader()).send({
      ...VALID_REQUEST_DTO, hospitalName: 'X',
    });
    expect(res.status).toBe(422);
  });

  it('422: rejects notes longer than 1000 characters', async () => {
    const res = await api.post('/v1/requests').set(authHeader()).send({
      ...VALID_REQUEST_DTO, notes: 'A'.repeat(1001),
    });
    expect(res.status).toBe(422);
  });

  it('429: enforces max 5 active requests per user (rate limit)', async () => {
    // Create 5 requests
    for (let i = 0; i < 5; i++) {
      const r = await api.post('/v1/requests').set(authHeader()).send(VALID_REQUEST_DTO);
      expect(r.status).toBe(201);
    }

    // 6th request should be rejected
    const res = await api.post('/v1/requests').set(authHeader()).send(VALID_REQUEST_DTO);
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('REQUEST_LIMIT_REACHED');
  });
});

describe('GET /v1/requests — List Own Requests', () => {
  let uid: string;
  let otherUid: string;

  beforeEach(async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    uid = u1.user.id;
    otherUid = u2.user.id;
    mockFirebaseUser(uid);

    // Create requests for both users
    await createTestRequest(uid, { status: 'PENDING' });
    await createTestRequest(uid, { status: 'COMPLETED' });
    await createTestRequest(otherUid, { status: 'PENDING' }); // should NOT appear
  });

  afterEach(async () => { await cleanupUsers(uid, otherUid); });

  it('200: returns only current user\'s requests (RLS enforced)', async () => {
    const res = await api.get('/v1/requests').set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2); // only uid's 2 requests
    res.body.data.forEach((r: any) => {
      expect(r.requester_id).toBe(uid);
    });
  });

  it('200: requests sorted newest first', async () => {
    const res = await api.get('/v1/requests').set(authHeader());

    const dates = res.body.data.map((r: any) => new Date(r.created_at).getTime());
    expect(dates[0]).toBeGreaterThanOrEqual(dates[1]);
  });

  it('200: cursor-based pagination works correctly', async () => {
    // Create 5 more requests
    for (let i = 0; i < 5; i++) {
      await createTestRequest(uid);
    }

    const page1 = await api.get('/v1/requests').set(authHeader()).query({ limit: '3' });
    expect(page1.body.data).toHaveLength(3);
    expect(page1.body.meta.pagination.nextCursor).toBeDefined();
    expect(page1.body.meta.pagination.hasMore).toBe(true);

    const page2 = await api.get('/v1/requests').set(authHeader())
      .query({ limit: '3', cursor: page1.body.meta.pagination.nextCursor });
    expect(page2.body.data.length).toBeGreaterThan(0);

    // No overlap between pages
    const ids1 = page1.body.data.map((r: any) => r.id);
    const ids2 = page2.body.data.map((r: any) => r.id);
    expect(ids1.some((id: string) => ids2.includes(id))).toBe(false);
  });
});

describe('GET /v1/requests/:id — Single Request', () => {
  let uid: string;
  let otherUid: string;
  let requestId: string;

  beforeEach(async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    uid = u1.user.id;
    otherUid = u2.user.id;
    const req = await createTestRequest(uid);
    requestId = req.id;
    mockFirebaseUser(uid);
  });

  afterEach(async () => { await cleanupUsers(uid, otherUid); });

  it('200: requester can view their own request', async () => {
    const res = await api.get(`/v1/requests/${requestId}`).set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(requestId);
  });

  it('403: another user cannot view someone else\'s request', async () => {
    mockFirebaseUser(otherUid);
    const res = await api.get(`/v1/requests/${requestId}`).set(authHeader());
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('404: returns 404 for non-existent request ID', async () => {
    const res = await api.get('/v1/requests/00000000-0000-0000-0000-000000000000').set(authHeader());
    expect(res.status).toBe(404);
  });
});

describe('PATCH /v1/requests/:id/cancel', () => {
  let uid: string;
  let requestId: string;

  beforeEach(async () => {
    const { user } = await createTestUser();
    uid = user.id;
    const req = await createTestRequest(uid, { status: 'PENDING' });
    requestId = req.id;
    mockFirebaseUser(uid);
  });

  afterEach(async () => { await cleanupUser(uid); });

  it('200: requester can cancel their PENDING request', async () => {
    const res = await api.patch(`/v1/requests/${requestId}/cancel`).set(authHeader());

    expect(res.status).toBe(200);

    const { data } = await supabaseAdmin
      .from('blood_requests').select('status').eq('id', requestId).single();
    expect(data!.status).toBe('CANCELLED');
  });

  it('400: cannot cancel an already COMPLETED request', async () => {
    await supabaseAdmin.from('blood_requests')
      .update({ status: 'COMPLETED' }).eq('id', requestId);

    const res = await api.patch(`/v1/requests/${requestId}/cancel`).set(authHeader());
    expect(res.status).toBe(400);
  });

  it('400: cannot cancel an already CANCELLED request', async () => {
    await supabaseAdmin.from('blood_requests')
      .update({ status: 'CANCELLED' }).eq('id', requestId);

    const res = await api.patch(`/v1/requests/${requestId}/cancel`).set(authHeader());
    expect(res.status).toBe(400);
  });

  it('403: another user cannot cancel someone else\'s request', async () => {
    const { user: other } = await createTestUser();
    mockFirebaseUser(other.id);

    const res = await api.patch(`/v1/requests/${requestId}/cancel`).set(authHeader());
    expect(res.status).toBe(403);

    await cleanupUser(other.id);
  });
});

// =============================================================================
// tests/integration/donors.integration.test.ts
// =============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { api, authHeader } from '../setup/helpers/request.helpers';
import { createTestUser, cleanupUsers } from '../setup/helpers/db.helpers';
import { mockFirebaseUser } from '../setup/helpers/auth.helpers';

describe('GET /v1/donors/nearby — Donor Proximity Search', () => {
  let requesterId: string;
  let nearbyDonorId: string;
  let farDonorId: string;
  let unavailableDonorId: string;

  beforeAll(async () => {
    // Requester in Dhaka city center
    const { user: r } = await createTestUser({ lat: 23.8103, lng: 90.4125 });
    requesterId = r.id;

    // Nearby A+ donor (1km away)
    const { user: n } = await createTestUser({
      bloodGroup: 'A_POSITIVE',
      isAvailable: true,
      lat: 23.8190, lng: 90.4100,
    });
    nearbyDonorId = n.id;

    // Far donor (200km away in Chittagong)
    const { user: f } = await createTestUser({
      bloodGroup: 'A_POSITIVE',
      isAvailable: true,
      lat: 22.3569, lng: 91.7832,
    });
    farDonorId = f.id;

    // Unavailable donor nearby
    const { user: u } = await createTestUser({
      bloodGroup: 'A_POSITIVE',
      isAvailable: false,
      lat: 23.8150, lng: 90.4200,
    });
    unavailableDonorId = u.id;

    mockFirebaseUser(requesterId);
  });

  afterAll(async () => {
    await cleanupUsers(requesterId, nearbyDonorId, farDonorId, unavailableDonorId);
  });

  it('200: returns donors within radius sorted by distance', async () => {
    const res = await api.get('/v1/donors/nearby').set(authHeader()).query({
      bloodGroup: 'A_POSITIVE',
      lat: '23.8103',
      lng: '90.4125',
      radius: '10',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.donors)).toBe(true);
  });

  it('200: excludes unavailable donors from results', async () => {
    const res = await api.get('/v1/donors/nearby').set(authHeader()).query({
      bloodGroup: 'A_POSITIVE',
      lat: '23.8103',
      lng: '90.4125',
      radius: '10',
    });

    const donorIds = res.body.data.donors.map((d: any) => d.id);
    expect(donorIds).not.toContain(unavailableDonorId);
  });

  it('200: excludes donors beyond search radius', async () => {
    const res = await api.get('/v1/donors/nearby').set(authHeader()).query({
      bloodGroup: 'A_POSITIVE',
      lat: '23.8103',
      lng: '90.4125',
      radius: '50',
    });

    const donorIds = res.body.data.donors.map((d: any) => d.id);
    expect(donorIds).not.toContain(farDonorId); // Chittagong is ~200km
  });

  it('200: donor names are privacy-masked', async () => {
    const res = await api.get('/v1/donors/nearby').set(authHeader()).query({
      bloodGroup: 'A_POSITIVE',
      lat: '23.8103',
      lng: '90.4125',
      radius: '10',
    });

    if (res.body.data.donors.length > 0) {
      const names: string[] = res.body.data.donors.map((d: any) => d.name);
      names.forEach(name => {
        expect(name).toMatch(/\*{3}/); // contains *** masking
      });
    }
  });

  it('200: returns empty array (not 404) when no donors in range', async () => {
    const res = await api.get('/v1/donors/nearby').set(authHeader()).query({
      bloodGroup: 'AB_NEGATIVE',  // rare blood type
      lat: '25.0',                 // remote location
      lng: '89.0',
      radius: '1',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.donors).toHaveLength(0);
  });

  it('200: returns searchRadius used in response', async () => {
    const res = await api.get('/v1/donors/nearby').set(authHeader()).query({
      bloodGroup: 'A_POSITIVE',
      lat: '23.8103',
      lng: '90.4125',
      radius: '10',
    });

    expect(res.body.data.searchRadius).toBeDefined();
    expect(typeof res.body.data.searchRadius).toBe('number');
  });

  it('422: missing required bloodGroup parameter', async () => {
    const res = await api.get('/v1/donors/nearby').set(authHeader()).query({
      lat: '23.8103', lng: '90.4125',
    });
    expect(res.status).toBe(422);
  });

  it('422: missing lat parameter', async () => {
    const res = await api.get('/v1/donors/nearby').set(authHeader()).query({
      bloodGroup: 'A_POSITIVE', lng: '90.4125',
    });
    expect(res.status).toBe(422);
  });

  it('422: radius exceeds 100km maximum', async () => {
    const res = await api.get('/v1/donors/nearby').set(authHeader()).query({
      bloodGroup: 'A_POSITIVE', lat: '23.8103', lng: '90.4125', radius: '101',
    });
    expect(res.status).toBe(422);
  });

  it('422: invalid blood group value', async () => {
    const res = await api.get('/v1/donors/nearby').set(authHeader()).query({
      bloodGroup: 'X_POSITIVE', lat: '23.8103', lng: '90.4125',
    });
    expect(res.status).toBe(422);
  });

  it('401: unauthenticated request rejected', async () => {
    const res = await api.get('/v1/donors/nearby').query({
      bloodGroup: 'A_POSITIVE', lat: '23.8103', lng: '90.4125',
    });
    expect(res.status).toBe(401);
  });

  it('200: cursor pagination returns unique sets', async () => {
    const page1 = await api.get('/v1/donors/nearby').set(authHeader()).query({
      bloodGroup: 'A_POSITIVE', lat: '23.8103', lng: '90.4125', radius: '50', limit: '2',
    });

    if (page1.body.meta?.pagination?.nextCursor) {
      const page2 = await api.get('/v1/donors/nearby').set(authHeader()).query({
        bloodGroup: 'A_POSITIVE', lat: '23.8103', lng: '90.4125',
        radius: '50', limit: '2',
        cursor: page1.body.meta.pagination.nextCursor,
      });

      const ids1 = page1.body.data.donors.map((d: any) => d.id);
      const ids2 = page2.body.data.donors.map((d: any) => d.id);
      expect(ids1.some((id: string) => ids2.includes(id))).toBe(false);
    }
  });
});

// =============================================================================
// tests/integration/health.integration.test.ts
// =============================================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { api, authHeader } from '../setup/helpers/request.helpers';
import { createTestUser, cleanupUser } from '../setup/helpers/db.helpers';
import { mockFirebaseUser } from '../setup/helpers/auth.helpers';
import { supabaseAdmin } from '@/config/supabase';
import { VALID_HEALTH_RECORD_DTO } from '../setup/helpers/fixtures/users.fixtures';
import { subDays } from 'date-fns';

describe('POST /v1/health/records — Add Health Record', () => {
  let uid: string;

  beforeEach(async () => {
    const { user } = await createTestUser();
    uid = user.id;
    mockFirebaseUser(uid);
  });

  afterEach(async () => { await cleanupUser(uid); });

  it('201: creates health record with all fields', async () => {
    const res = await api.post('/v1/health/records').set(authHeader()).send(VALID_HEALTH_RECORD_DTO);

    expect(res.status).toBe(201);
    expect(res.body.data.systolic).toBe(120);
    expect(res.body.data.diastolic).toBe(80);
    expect(res.body.data.hemoglobin).toBe(14.5);
    expect(res.body.data.weight).toBe(68.5);
    expect(res.body.data.has_illness).toBe(false);
  });

  it('201: creates record with only weight (other fields optional)', async () => {
    const res = await api.post('/v1/health/records').set(authHeader()).send({ weight: 70 });
    expect(res.status).toBe(201);
    expect(res.body.data.weight).toBe(70);
    expect(res.body.data.hemoglobin).toBeNull();
  });

  it('201: creates record for user with illness', async () => {
    const res = await api.post('/v1/health/records').set(authHeader()).send({
      ...VALID_HEALTH_RECORD_DTO,
      hasIllness: true,
      illnessNotes: 'Fever and cold for 3 days',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.has_illness).toBe(true);
    expect(res.body.data.illness_notes).toBe('Fever and cold for 3 days');
  });

  it('201: record is append-only (no update endpoint)', async () => {
    // First record
    const r1 = await api.post('/v1/health/records').set(authHeader()).send({ weight: 68 });
    // Second record (different values)
    const r2 = await api.post('/v1/health/records').set(authHeader()).send({ weight: 69 });

    expect(r1.body.data.id).not.toBe(r2.body.data.id); // Two separate records
  });

  it('422: rejects systolic out of valid range (< 60)', async () => {
    const res = await api.post('/v1/health/records').set(authHeader()).send({ systolic: 50, diastolic: 80 });
    expect(res.status).toBe(422);
  });

  it('422: rejects hemoglobin below valid range (< 5.0)', async () => {
    const res = await api.post('/v1/health/records').set(authHeader()).send({ hemoglobin: 4.9 });
    expect(res.status).toBe(422);
  });

  it('other users cannot read this record (RLS)', async () => {
    await api.post('/v1/health/records').set(authHeader()).send(VALID_HEALTH_RECORD_DTO);

    const { user: other } = await createTestUser();
    mockFirebaseUser(other.id);

    const res = await api.get('/v1/health/records').set(authHeader());
    expect(res.body.data).toHaveLength(0); // RLS returns empty, not 403

    await cleanupUser(other.id);
  });
});

describe('GET /v1/users/me/eligibility — Eligibility Calculation', () => {
  let uid: string;

  beforeEach(async () => {
    const { user } = await createTestUser({ gender: 'MALE', dateOfBirth: '1995-06-15' });
    uid = user.id;
    mockFirebaseUser(uid);
  });

  afterEach(async () => { await cleanupUser(uid); });

  it('200: eligible with no health records and no donations', async () => {
    const res = await api.get('/v1/users/me/eligibility').set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body.data.eligible).toBe(true);
  });

  it('200: not eligible with low hemoglobin (13.4 for male)', async () => {
    await supabaseAdmin.from('health_records').insert({
      user_id: uid,
      hemoglobin: 13.4,
      has_illness: false,
    });
    const res = await api.get('/v1/users/me/eligibility').set(authHeader());
    expect(res.body.data.eligible).toBe(false);
    expect(res.body.data.reason).toBe('LOW_HEMOGLOBIN');
  });

  it('200: not eligible 30 days after donation (male needs 56)', async () => {
    await supabaseAdmin.from('donation_records').insert({
      donor_id: uid, recipient_id: uid, type: 'DONATION',
      blood_group: 'A_POSITIVE', units: 1,
      donated_at: subDays(new Date(), 30).toISOString(),
    });
    const res = await api.get('/v1/users/me/eligibility').set(authHeader());
    expect(res.body.data.eligible).toBe(false);
    expect(res.body.data.reason).toBe('TOO_SOON');
    expect(res.body.data.eligibleOn).toBeDefined();
  });

  it('200: eligible 57 days after last donation (male)', async () => {
    await supabaseAdmin.from('donation_records').insert({
      donor_id: uid, recipient_id: uid, type: 'DONATION',
      blood_group: 'A_POSITIVE', units: 1,
      donated_at: subDays(new Date(), 57).toISOString(),
    });
    const res = await api.get('/v1/users/me/eligibility').set(authHeader());
    expect(res.body.data.eligible).toBe(true);
  });

  it('200: not eligible with current illness', async () => {
    await supabaseAdmin.from('health_records').insert({
      user_id: uid, has_illness: true, illness_notes: 'Fever',
    });
    const res = await api.get('/v1/users/me/eligibility').set(authHeader());
    expect(res.body.data.eligible).toBe(false);
    expect(res.body.data.reason).toBe('CURRENT_ILLNESS');
  });
});

// =============================================================================
// tests/integration/admin.integration.test.ts
// =============================================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { api, authHeader } from '../setup/helpers/request.helpers';
import { createTestUser, cleanupUsers } from '../setup/helpers/db.helpers';
import { mockFirebaseUser } from '../setup/helpers/auth.helpers';
import { supabaseAdmin } from '@/config/supabase';

describe('Admin User Management', () => {
  let adminId: string;
  let superAdminId: string;
  let donorId: string;

  beforeEach(async () => {
    const { user: a } = await createTestUser({ role: 'ADMIN' });
    const { user: s } = await createTestUser({ role: 'SUPER_ADMIN' });
    const { user: d } = await createTestUser({ role: 'DONOR' });
    adminId = a.id;
    superAdminId = s.id;
    donorId = d.id;
  });

  afterEach(async () => { await cleanupUsers(adminId, superAdminId, donorId); });

  it('200: ADMIN can list all users', async () => {
    mockFirebaseUser(adminId, 'ADMIN');
    const res = await api.get('/v1/admin/users').set(authHeader());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('403: DONOR cannot access admin user list', async () => {
    mockFirebaseUser(donorId, 'DONOR');
    const res = await api.get('/v1/admin/users').set(authHeader());
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('200: ADMIN can suspend a user', async () => {
    mockFirebaseUser(adminId, 'ADMIN');
    const res = await api.patch(`/v1/admin/users/${donorId}/ban`).set(authHeader());

    expect(res.status).toBe(200);

    const { data } = await supabaseAdmin
      .from('users').select('is_active').eq('id', donorId).single();
    expect(data!.is_active).toBe(false);

    const { firebaseAuth } = require('@/config/firebase-admin');
    expect(vi.mocked(firebaseAuth.revokeRefreshTokens)).toHaveBeenCalledWith(donorId);
  });

  it('403: ADMIN cannot assign ADMIN role to another user', async () => {
    mockFirebaseUser(adminId, 'ADMIN');
    const res = await api.patch(`/v1/admin/users/${donorId}/role`)
      .set(authHeader())
      .send({ role: 'ADMIN' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('200: SUPER_ADMIN can assign ADMIN role', async () => {
    mockFirebaseUser(superAdminId, 'SUPER_ADMIN');
    const res = await api.patch(`/v1/admin/users/${donorId}/role`)
      .set(authHeader())
      .send({ role: 'ADMIN' });

    expect(res.status).toBe(200);

    const { data } = await supabaseAdmin
      .from('users').select('role').eq('id', donorId).single();
    expect(data!.role).toBe('ADMIN');
  });

  it('403: SUPER_ADMIN cannot assign SUPER_ADMIN role via API', async () => {
    mockFirebaseUser(superAdminId, 'SUPER_ADMIN');
    const res = await api.patch(`/v1/admin/users/${donorId}/role`)
      .set(authHeader())
      .send({ role: 'SUPER_ADMIN' });

    expect(res.status).toBe(403);
  });

  it('200: ADMIN can view analytics dashboard', async () => {
    mockFirebaseUser(adminId, 'ADMIN');
    const res = await api.get('/v1/admin/analytics/dashboard').set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('totalUsers');
  });

  it('403: REQUESTER cannot access analytics', async () => {
    const { user: req } = await createTestUser({ role: 'REQUESTER' });
    mockFirebaseUser(req.id, 'REQUESTER');
    const res = await api.get('/v1/admin/analytics/dashboard').set(authHeader());
    expect(res.status).toBe(403);
    await cleanupUsers(req.id);
  });
});
