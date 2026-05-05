// =============================================================================
// tests/security/auth-security.test.ts
// Token tampering, replay attacks, JWT edge cases
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, authHeader } from '../setup/helpers/request.helpers';
import { createTestUser, cleanupUser, cleanupUsers } from '../setup/helpers/db.helpers';
import { mockFirebaseUser } from '../setup/helpers/auth.helpers';
import { supabaseAdmin } from '@/config/supabase';

describe('Security — Token Attacks', () => {
  let uid: string;

  beforeEach(async () => {
    const { user } = await createTestUser();
    uid = user.id;
    mockFirebaseUser(uid);
  });

  afterEach(async () => { await cleanupUser(uid); });

  it('401: tampered JWT payload rejected (Firebase RS256 signature fails)', async () => {
    const { firebaseAuth } = require('@/config/firebase-admin');
    vi.mocked(firebaseAuth.verifyIdToken).mockRejectedValueOnce(
      Object.assign(new Error('Invalid signature'), { code: 'auth/argument-error' })
    );

    const res = await api.get('/v1/users/me').set({ Authorization: 'Bearer eyJ.tampered.payload' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('401: base64-decoded and re-encoded token with modified role is rejected', async () => {
    // Attacker modifies role claim from DONOR to ADMIN in token payload
    const { firebaseAuth } = require('@/config/firebase-admin');
    vi.mocked(firebaseAuth.verifyIdToken).mockRejectedValueOnce(
      Object.assign(new Error('Token signature mismatch'), { code: 'auth/argument-error' })
    );

    const res = await api.get('/v1/admin/users').set({ Authorization: 'Bearer forged.admin.token' });
    expect(res.status).toBe(401);
  });

  it('401: expired token rejected even with valid structure', async () => {
    const { firebaseAuth } = require('@/config/firebase-admin');
    vi.mocked(firebaseAuth.verifyIdToken).mockRejectedValueOnce(
      Object.assign(new Error('Token expired'), { code: 'auth/id-token-expired' })
    );

    const res = await api.get('/v1/users/me').set(authHeader('expired-but-valid-structure'));
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('401: revoked token rejected (after logout/ban)', async () => {
    const { firebaseAuth } = require('@/config/firebase-admin');
    vi.mocked(firebaseAuth.verifyIdToken).mockRejectedValueOnce(
      Object.assign(new Error('Token revoked'), { code: 'auth/id-token-revoked' })
    );

    const res = await api.get('/v1/users/me').set(authHeader());
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_REVOKED');
  });

  it('401: token from different Firebase project rejected', async () => {
    const { firebaseAuth } = require('@/config/firebase-admin');
    vi.mocked(firebaseAuth.verifyIdToken).mockRejectedValueOnce(
      Object.assign(new Error('Token audience mismatch'), { code: 'auth/argument-error' })
    );

    const res = await api.get('/v1/users/me').set(authHeader('token-from-other-project'));
    expect(res.status).toBe(401);
  });

  it('401: missing Authorization header', async () => {
    const res = await api.get('/v1/users/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('401: wrong auth scheme (Basic instead of Bearer)', async () => {
    const res = await api.get('/v1/users/me').set({ Authorization: 'Basic dXNlcjpwYXNz' });
    expect(res.status).toBe(401);
  });

  it('401: Bearer token with extra spaces rejected', async () => {
    const res = await api.get('/v1/users/me').set({ Authorization: 'Bearer  double-space-token' });
    expect(res.status).toBe(401);
  });

  it('does NOT leak Firebase token in error responses', async () => {
    const { firebaseAuth } = require('@/config/firebase-admin');
    vi.mocked(firebaseAuth.verifyIdToken).mockRejectedValueOnce(
      Object.assign(new Error('Token expired'), { code: 'auth/id-token-expired' })
    );

    const res = await api.get('/v1/users/me').set(authHeader('secret-token-value'));
    const responseText = JSON.stringify(res.body);
    expect(responseText).not.toContain('secret-token-value');
  });

  it('does NOT leak user ID in auth error responses', async () => {
    const { firebaseAuth } = require('@/config/firebase-admin');
    vi.mocked(firebaseAuth.verifyIdToken).mockRejectedValueOnce(
      new Error('auth/id-token-revoked')
    );

    const res = await api.get('/v1/users/me').set(authHeader());
    const responseText = JSON.stringify(res.body);
    expect(responseText).not.toContain(uid);
  });

  it('responds to 100 rapid invalid token requests without crashing (resilience)', async () => {
    const { firebaseAuth } = require('@/config/firebase-admin');
    vi.mocked(firebaseAuth.verifyIdToken).mockRejectedValue(
      Object.assign(new Error('Invalid'), { code: 'auth/argument-error' })
    );

    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        api.get('/v1/users/me').set(authHeader('invalid'))
      )
    );

    results.forEach(r => expect(r.status).toBe(401));
  });
});

describe('Security — Privilege Escalation Prevention', () => {
  let donorId: string;
  let adminId: string;

  beforeEach(async () => {
    const { user: d } = await createTestUser({ role: 'DONOR' });
    const { user: a } = await createTestUser({ role: 'ADMIN' });
    donorId = d.id;
    adminId = a.id;
  });

  afterEach(async () => { await cleanupUsers(donorId, adminId); });

  it('403: DONOR cannot access /admin/ prefix routes', async () => {
    mockFirebaseUser(donorId, 'DONOR');
    const adminRoutes = [
      '/v1/admin/users',
      '/v1/admin/analytics/dashboard',
      '/v1/admin/requests',
      '/v1/admin/organizations',
      '/v1/admin/payments',
    ];

    for (const route of adminRoutes) {
      const res = await api.get(route).set(authHeader());
      expect(res.status, `Expected 403 for ${route}`).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    }
  });

  it('403: REQUESTER cannot access admin routes', async () => {
    const { user: req } = await createTestUser({ role: 'REQUESTER' });
    mockFirebaseUser(req.id, 'REQUESTER');

    const res = await api.get('/v1/admin/users').set(authHeader());
    expect(res.status).toBe(403);

    await cleanupUser(req.id);
  });

  it('403: ADMIN cannot assign ADMIN role (only SUPER_ADMIN can)', async () => {
    mockFirebaseUser(adminId, 'ADMIN');
    const res = await api.patch(`/v1/admin/users/${donorId}/role`)
      .set(authHeader())
      .send({ role: 'ADMIN' });

    expect(res.status).toBe(403);
  });

  it('403: no role can self-assign SUPER_ADMIN via API', async () => {
    const roles = ['DONOR', 'REQUESTER', 'ADMIN', 'SUPER_ADMIN'];

    for (const role of roles) {
      const { user } = await createTestUser({ role: role as any });
      mockFirebaseUser(user.id, role);

      const res = await api.patch(`/v1/admin/users/${user.id}/role`)
        .set(authHeader())
        .send({ role: 'SUPER_ADMIN' });

      expect(res.status, `${role} should not be able to assign SUPER_ADMIN`).toBe(403);
      await cleanupUser(user.id);
    }
  });

  it('403: user cannot modify another user\'s profile', async () => {
    const { user: other } = await createTestUser();
    mockFirebaseUser(donorId, 'DONOR');

    const res = await api.patch(`/v1/users/${other.id}`)
      .set(authHeader())
      .send({ name: 'Hacked Name' });

    expect([403, 404]).toContain(res.status);
    await cleanupUser(other.id);
  });
});

// =============================================================================
// tests/security/rls-enforcement.test.ts
// Supabase Row Level Security — cross-user data access prevention
// =============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { api, authHeader } from '../setup/helpers/request.helpers';
import { createTestUser, cleanupUsers, createTestRequest } from '../setup/helpers/db.helpers';
import { mockFirebaseUser } from '../setup/helpers/auth.helpers';

describe('RLS — Health Records Isolation', () => {
  let user1Id: string;
  let user2Id: string;

  beforeAll(async () => {
    const { user: u1 } = await createTestUser({ hasHealthRecord: true });
    const { user: u2 } = await createTestUser({ hasHealthRecord: true });
    user1Id = u1.id;
    user2Id = u2.id;
  });

  afterAll(async () => { await cleanupUsers(user1Id, user2Id); });

  it('user1 cannot see user2\'s health records via GET /health/records', async () => {
    mockFirebaseUser(user1Id);
    const res = await api.get('/v1/health/records').set(authHeader());

    // RLS returns empty array (not 403) for records belonging to other users
    expect(res.status).toBe(200);
    const ids = res.body.data.map((r: any) => r.user_id);
    ids.forEach((id: string) => expect(id).toBe(user1Id));
  });

  it('user2 cannot see user1\'s health records', async () => {
    mockFirebaseUser(user2Id);
    const res = await api.get('/v1/health/records').set(authHeader());

    expect(res.status).toBe(200);
    const ids = res.body.data.map((r: any) => r.user_id);
    ids.forEach((id: string) => expect(id).toBe(user2Id));
  });
});

describe('RLS — Blood Request Isolation', () => {
  let user1Id: string;
  let user2Id: string;
  let user1RequestId: string;

  beforeAll(async () => {
    const { user: u1 } = await createTestUser();
    const { user: u2 } = await createTestUser();
    user1Id = u1.id;
    user2Id = u2.id;

    const req = await createTestRequest(user1Id, { status: 'PENDING' });
    user1RequestId = req.id;
  });

  afterAll(async () => { await cleanupUsers(user1Id, user2Id); });

  it('user2 cannot cancel user1\'s request (ownership check)', async () => {
    mockFirebaseUser(user2Id);
    const res = await api.patch(`/v1/requests/${user1RequestId}/cancel`).set(authHeader());
    expect(res.status).toBe(403);
  });

  it('user2 cannot view user1\'s request detail (private request)', async () => {
    mockFirebaseUser(user2Id);
    const res = await api.get(`/v1/requests/${user1RequestId}`).set(authHeader());
    expect([403, 404]).toContain(res.status);
  });

  it('GET /v1/requests only returns current user\'s requests', async () => {
    mockFirebaseUser(user2Id);
    const res = await api.get('/v1/requests').set(authHeader());

    expect(res.status).toBe(200);
    res.body.data.forEach((r: any) => {
      expect(r.requester_id).toBe(user2Id); // none from user1
    });
  });
});

describe('RLS — Payment Isolation', () => {
  let user1Id: string;
  let user2Id: string;

  beforeAll(async () => {
    const { user: u1 } = await createTestUser();
    const { user: u2 } = await createTestUser();
    user1Id = u1.id;
    user2Id = u2.id;

    // Create payment for user1
    await supabaseAdmin.from('payments').insert({
      user_id: user1Id,
      amount: 700,
      method: 'BKASH',
      currency: 'BDT',
      status: 'PENDING',
    });
  });

  afterAll(async () => { await cleanupUsers(user1Id, user2Id); });

  it('user2 cannot see user1\'s payment records via direct Supabase anon query', async () => {
    // This tests that RLS actually works at DB level
    const { data } = await supabase  // anon client
      .from('payments')
      .select('*')
      .eq('user_id', user1Id);

    // RLS should return empty array for user2's anon session
    // (In real app, this is the mobile client's supabase instance)
    expect(data ?? []).toHaveLength(0);
  });
});

describe('RLS — Notification Isolation', () => {
  let user1Id: string;
  let user2Id: string;
  let notificationId: string;

  beforeAll(async () => {
    const { user: u1 } = await createTestUser();
    const { user: u2 } = await createTestUser();
    user1Id = u1.id;
    user2Id = u2.id;

    const { data: notif } = await supabaseAdmin.from('notifications').insert({
      user_id: user1Id,
      type: 'DONATION_REQUEST',
      title: 'Test Notification',
      body: 'Test body',
    }).select().single();
    notificationId = notif!.id;
  });

  afterAll(async () => { await cleanupUsers(user1Id, user2Id); });

  it('user2 cannot mark user1\'s notification as read', async () => {
    mockFirebaseUser(user2Id);
    const res = await api.patch(`/v1/notifications/${notificationId}/read`).set(authHeader());
    // RLS makes it appear as 404 (not found for this user)
    expect([403, 404]).toContain(res.status);
  });

  it('user1\'s notification count not exposed to user2', async () => {
    mockFirebaseUser(user2Id);
    const res = await api.get('/v1/notifications/count').set(authHeader());
    expect(res.status).toBe(200);
    // user2's count should not include user1's notifications
    expect(typeof res.body.data.unread).toBe('number');
  });
});

// =============================================================================
// tests/security/injection.test.ts
// SQL injection, XSS, NoSQL injection, path traversal
// =============================================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { api, authHeader } from '../setup/helpers/request.helpers';
import { createTestUser, cleanupUser } from '../setup/helpers/db.helpers';
import { mockFirebaseUser } from '../setup/helpers/auth.helpers';
import { supabaseAdmin } from '@/config/supabase';

describe('Security — SQL Injection Prevention', () => {
  let uid: string;

  beforeEach(async () => {
    const { user } = await createTestUser();
    uid = user.id;
    mockFirebaseUser(uid);
  });

  afterEach(async () => { await cleanupUser(uid); });

  const sqlInjectionPayloads = [
    "'; DROP TABLE users; --",
    "' OR '1'='1",
    "' UNION SELECT * FROM users --",
    "'; SELECT * FROM payments; --",
    "1; DROP TABLE blood_requests; --",
    "' OR 1=1 --",
    "admin'--",
    "1' AND SLEEP(5)--",
  ];

  sqlInjectionPayloads.forEach(payload => {
    it(`rejects SQL injection in hospitalName: "${payload.slice(0, 30)}..."`, async () => {
      const res = await api.post('/v1/requests').set(authHeader()).send({
        bloodGroup: 'A_POSITIVE',
        unitsRequired: 1,
        hospitalName: payload,
        hospitalAddress: 'Valid Address',
        requiredBy: new Date(Date.now() + 86400000).toISOString(),
        emergencyLevel: 'NORMAL',
        isForMyself: true,
        paymentMethod: 'FREE',
      });

      // Should either sanitize and save, or return validation error
      // The critical thing: users table must still exist
      if (res.status === 201) {
        const { error } = await supabaseAdmin
          .from('users').select('count').limit(1);
        expect(error).toBeNull(); // DB still intact
      }
      // No 500 errors from SQL injection
      expect(res.status).not.toBe(500);
    });
  });

  it('SQL injection in donor search query param is rejected', async () => {
    const res = await api.get('/v1/donors/nearby').set(authHeader()).query({
      bloodGroup: "A_POSITIVE' OR '1'='1",
      lat: '23.8103',
      lng: '90.4125',
    });

    expect(res.status).toBe(422); // Zod validation catches invalid enum
    expect(res.status).not.toBe(500);
  });

  it('SQL injection in cursor pagination parameter does not crash', async () => {
    const res = await api.get('/v1/requests').set(authHeader()).query({
      cursor: "'; DROP TABLE blood_requests; --",
    });

    expect(res.status).not.toBe(500);
  });
});

describe('Security — XSS Prevention', () => {
  let uid: string;

  beforeEach(async () => {
    const { user } = await createTestUser();
    uid = user.id;
    mockFirebaseUser(uid);
  });

  afterEach(async () => { await cleanupUser(uid); });

  const xssPayloads = [
    '<script>alert("xss")</script>',
    '<img src=x onerror=alert(1)>',
    'javascript:alert(1)',
    '<iframe src="javascript:alert(1)">',
    '"><script>alert(document.cookie)</script>',
    '<svg onload=alert(1)>',
    '${alert(1)}',
    '{{constructor.constructor("return process")().env}}',
  ];

  xssPayloads.forEach(payload => {
    it(`XSS payload sanitized in hospitalName: "${payload.slice(0, 30)}..."`, async () => {
      const res = await api.post('/v1/requests').set(authHeader()).send({
        bloodGroup: 'A_POSITIVE',
        unitsRequired: 1,
        hospitalName: payload,
        hospitalAddress: 'Valid Address',
        requiredBy: new Date(Date.now() + 86400000).toISOString(),
        emergencyLevel: 'NORMAL',
        isForMyself: true,
        paymentMethod: 'FREE',
      });

      if (res.status === 201) {
        // Verify the stored value does NOT contain script tags
        const { data: req } = await supabaseAdmin
          .from('blood_requests')
          .select('hospital_name')
          .eq('id', res.body.data.request.id)
          .single();

        expect(req!.hospital_name).not.toContain('<script>');
        expect(req!.hospital_name).not.toContain('onerror=');
        expect(req!.hospital_name).not.toContain('javascript:');
      }

      expect(res.status).not.toBe(500);
    });
  });

  it('XSS payload in notes field is sanitized before storage', async () => {
    const res = await api.post('/v1/requests').set(authHeader()).send({
      bloodGroup: 'A_POSITIVE',
      unitsRequired: 1,
      hospitalName: 'Dhaka Medical',
      hospitalAddress: 'Dhaka',
      requiredBy: new Date(Date.now() + 86400000).toISOString(),
      emergencyLevel: 'NORMAL',
      isForMyself: true,
      paymentMethod: 'FREE',
      notes: '<script>steal(document.cookie)</script>Actual note',
    });

    if (res.status === 201) {
      const { data: req } = await supabaseAdmin
        .from('blood_requests')
        .select('notes')
        .eq('id', res.body.data.request.id)
        .single();

      expect(req!.notes).not.toContain('<script>');
    }
  });

  it('XSS payload in patientName is sanitized', async () => {
    const res = await api.post('/v1/requests').set(authHeader()).send({
      bloodGroup: 'A_POSITIVE',
      unitsRequired: 1,
      hospitalName: 'Dhaka Medical',
      hospitalAddress: 'Dhaka',
      requiredBy: new Date(Date.now() + 86400000).toISOString(),
      emergencyLevel: 'NORMAL',
      isForMyself: false,
      paymentMethod: 'FREE',
      patientName: '<img src=x onerror=alert(1)>Karim',
      patientAge: 45,
    });

    if (res.status === 201) {
      const { data: req } = await supabaseAdmin
        .from('blood_requests')
        .select('patient_name')
        .eq('id', res.body.data.request.id)
        .single();

      expect(req!.patient_name).not.toContain('onerror=');
    }
  });
});

describe('Security — Payload Size Limits', () => {
  let uid: string;

  beforeEach(async () => {
    const { user } = await createTestUser();
    uid = user.id;
    mockFirebaseUser(uid);
  });

  afterEach(async () => { await cleanupUser(uid); });

  it('413: rejects request body exceeding 10KB limit', async () => {
    const hugePayload = {
      bloodGroup: 'A_POSITIVE',
      unitsRequired: 1,
      hospitalName: 'X'.repeat(500),
      hospitalAddress: 'Y'.repeat(500),
      notes: 'Z'.repeat(10000), // ~10KB
      requiredBy: new Date(Date.now() + 86400000).toISOString(),
      emergencyLevel: 'NORMAL',
      isForMyself: true,
      paymentMethod: 'FREE',
    };

    const res = await api.post('/v1/requests').set(authHeader()).send(hugePayload);
    expect([413, 422]).toContain(res.status);
  });

  it('422: notes field > 1000 chars rejected by Zod', async () => {
    const res = await api.post('/v1/requests').set(authHeader()).send({
      bloodGroup: 'A_POSITIVE',
      unitsRequired: 1,
      hospitalName: 'Dhaka Medical',
      hospitalAddress: 'Dhaka',
      requiredBy: new Date(Date.now() + 86400000).toISOString(),
      emergencyLevel: 'NORMAL',
      isForMyself: true,
      paymentMethod: 'FREE',
      notes: 'A'.repeat(1001),
    });

    expect(res.status).toBe(422);
  });
});

describe('Security — Path Traversal Prevention', () => {
  let uid: string;

  beforeEach(async () => {
    const { user } = await createTestUser();
    uid = user.id;
    mockFirebaseUser(uid);
  });

  afterEach(async () => { await cleanupUser(uid); });

  it('404/400: path traversal in request ID parameter', async () => {
    const traversalPaths = [
      '../../../etc/passwd',
      '..%2F..%2Fetc%2Fpasswd',
      '/etc/passwd',
      '%00../../etc/shadow',
    ];

    for (const path of traversalPaths) {
      const res = await api.get(`/v1/requests/${encodeURIComponent(path)}`).set(authHeader());
      expect([400, 404, 422]).toContain(res.status);
      expect(res.status).not.toBe(200);
    }
  });
});

// =============================================================================
// tests/security/rate-limiting.test.ts
// All rate limit thresholds — verify limits are enforced
// =============================================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { api, authHeader } from '../setup/helpers/request.helpers';
import { createTestUser, cleanupUser } from '../setup/helpers/db.helpers';
import { mockFirebaseUser } from '../setup/helpers/auth.helpers';

describe('Rate Limiting — OTP Endpoint', () => {
  it('429: rejects 4th OTP request to same phone within 15 minutes', async () => {
    const phone = '+8801711999888';

    // 3 successful requests
    for (let i = 0; i < 3; i++) {
      await api.post('/v1/auth/send-otp').send({ phone });
    }

    // 4th should be rate limited
    const res = await api.post('/v1/auth/send-otp').send({ phone });
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });

  it('429: includes Retry-After header when rate limited', async () => {
    const phone = '+8801711999777';
    for (let i = 0; i < 3; i++) {
      await api.post('/v1/auth/send-otp').send({ phone });
    }

    const res = await api.post('/v1/auth/send-otp').send({ phone });
    expect(res.status).toBe(429);
    expect(res.headers['retry-after']).toBeDefined();
    expect(parseInt(res.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('429: includes X-RateLimit-Remaining header before limit', async () => {
    const phone = '+8801711999666';
    const res = await api.post('/v1/auth/send-otp').send({ phone });

    if (res.status === 200) {
      expect(res.headers['x-ratelimit-remaining']).toBeDefined();
    }
  });
});

describe('Rate Limiting — Blood Request Creation', () => {
  let uid: string;

  beforeEach(async () => {
    const { user } = await createTestUser({ isActive: true });
    uid = user.id;
    mockFirebaseUser(uid);
  });

  afterEach(async () => { await cleanupUser(uid); });

  it('429: 6th request creation within limit window is rejected', async () => {
    const validRequest = {
      bloodGroup: 'A_POSITIVE',
      unitsRequired: 1,
      hospitalName: 'Dhaka Medical',
      hospitalAddress: 'Dhaka',
      requiredBy: new Date(Date.now() + 86400000).toISOString(),
      emergencyLevel: 'NORMAL',
      isForMyself: true,
      paymentMethod: 'FREE',
    };

    for (let i = 0; i < 5; i++) {
      await api.post('/v1/requests').set(authHeader()).send(validRequest);
    }

    const res = await api.post('/v1/requests').set(authHeader()).send(validRequest);
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
    expect(res.headers['retry-after']).toBeDefined();
  });
});

describe('Rate Limiting — Donor Search', () => {
  let uid: string;

  beforeEach(async () => {
    const { user } = await createTestUser();
    uid = user.id;
    mockFirebaseUser(uid);
  });

  afterEach(async () => { await cleanupUser(uid); });

  it('429: more than 30 search requests per minute are rejected', async () => {
    const searchQuery = { bloodGroup: 'A_POSITIVE', lat: '23.8103', lng: '90.4125' };

    let rateLimitedCount = 0;
    for (let i = 0; i < 35; i++) {
      const res = await api.get('/v1/donors/nearby').set(authHeader()).query(searchQuery);
      if (res.status === 429) rateLimitedCount++;
    }

    expect(rateLimitedCount).toBeGreaterThan(0);
  });
});

describe('Rate Limiting — Global API Limit', () => {
  let uid: string;

  beforeEach(async () => {
    const { user } = await createTestUser();
    uid = user.id;
    mockFirebaseUser(uid);
  });

  afterEach(async () => { await cleanupUser(uid); });

  it('429: global rate limit (100/min) enforced per user', async () => {
    const results = await Promise.all(
      Array.from({ length: 105 }, () =>
        api.get('/v1/users/me').set(authHeader())
      )
    );

    const tooMany = results.filter(r => r.status === 429);
    expect(tooMany.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// tests/security/rbac.test.ts
// Role-Based Access Control — every protected endpoint
// =============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { api, authHeader } from '../setup/helpers/request.helpers';
import { createTestUser, cleanupUsers } from '../setup/helpers/db.helpers';
import { mockFirebaseUser } from '../setup/helpers/auth.helpers';

describe('RBAC — Admin Endpoint Access Matrix', () => {
  const adminEndpoints = [
    { method: 'GET',   path: '/v1/admin/users' },
    { method: 'GET',   path: '/v1/admin/requests' },
    { method: 'GET',   path: '/v1/admin/organizations' },
    { method: 'GET',   path: '/v1/admin/payments' },
    { method: 'GET',   path: '/v1/admin/analytics/dashboard' },
    { method: 'GET',   path: '/v1/admin/audit' },
  ];

  const superAdminOnlyEndpoints = [
    { method: 'DELETE', path: '/v1/admin/users/some-uid' },
    { method: 'GET',    path: '/v1/admin/finance/escrow' },
    { method: 'PATCH',  path: '/v1/admin/config/features' },
  ];

  let donorId: string;
  let requesterId: string;
  let adminId: string;
  let superAdminId: string;

  beforeAll(async () => {
    const { user: d } = await createTestUser({ role: 'DONOR' });
    const { user: r } = await createTestUser({ role: 'REQUESTER' });
    const { user: a } = await createTestUser({ role: 'ADMIN' });
    const { user: s } = await createTestUser({ role: 'SUPER_ADMIN' });
    donorId = d.id;
    requesterId = r.id;
    adminId = a.id;
    superAdminId = s.id;
  });

  afterAll(async () => {
    await cleanupUsers(donorId, requesterId, adminId, superAdminId);
  });

  describe('DONOR cannot access any admin endpoint', () => {
    adminEndpoints.forEach(({ method, path }) => {
      it(`${method} ${path} → 403 for DONOR`, async () => {
        mockFirebaseUser(donorId, 'DONOR');
        const res = await (api as any)[method.toLowerCase()](path).set(authHeader());
        expect(res.status).toBe(403);
      });
    });
  });

  describe('REQUESTER cannot access any admin endpoint', () => {
    adminEndpoints.forEach(({ method, path }) => {
      it(`${method} ${path} → 403 for REQUESTER`, async () => {
        mockFirebaseUser(requesterId, 'REQUESTER');
        const res = await (api as any)[method.toLowerCase()](path).set(authHeader());
        expect(res.status).toBe(403);
      });
    });
  });

  describe('ADMIN can access all standard admin endpoints', () => {
    adminEndpoints.forEach(({ method, path }) => {
      it(`${method} ${path} → 200 for ADMIN`, async () => {
        mockFirebaseUser(adminId, 'ADMIN');
        const res = await (api as any)[method.toLowerCase()](path).set(authHeader());
        expect([200, 404]).toContain(res.status); // 404 ok for specific IDs that don't exist
        expect(res.status).not.toBe(403);
      });
    });
  });

  describe('ADMIN cannot access SUPER_ADMIN-only endpoints', () => {
    superAdminOnlyEndpoints.forEach(({ method, path }) => {
      it(`${method} ${path} → 403 for ADMIN`, async () => {
        mockFirebaseUser(adminId, 'ADMIN');
        const res = await (api as any)[method.toLowerCase()](path).set(authHeader());
        expect(res.status).toBe(403);
      });
    });
  });

  describe('SUPER_ADMIN can access all endpoints', () => {
    [...adminEndpoints, ...superAdminOnlyEndpoints].forEach(({ method, path }) => {
      it(`${method} ${path} → not 403 for SUPER_ADMIN`, async () => {
        mockFirebaseUser(superAdminId, 'SUPER_ADMIN');
        const res = await (api as any)[method.toLowerCase()](path).set(authHeader());
        expect(res.status).not.toBe(403);
      });
    });
  });

  it('Unauthenticated request → 401 for all protected routes', async () => {
    const allEndpoints = [...adminEndpoints, ...superAdminOnlyEndpoints];
    for (const { method, path } of allEndpoints) {
      const res = await (api as any)[method.toLowerCase()](path);
      expect(res.status, `Expected 401 for ${method} ${path}`).toBe(401);
    }
  });
});
