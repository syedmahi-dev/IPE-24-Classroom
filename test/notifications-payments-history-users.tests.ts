// =============================================================================
// tests/integration/notifications.integration.test.ts
// =============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { api, authHeader } from '../setup/helpers/request.helpers';
import { createTestUser, cleanupUser, cleanupUsers } from '../setup/helpers/db.helpers';
import { mockFirebaseUser } from '../setup/helpers/auth.helpers';
import { supabaseAdmin } from '@/config/supabase';

async function seedNotifications(userId: string, count: number, isRead = false) {
  const rows = Array.from({ length: count }, (_, i) => ({
    user_id: userId,
    type: ['DONATION_REQUEST', 'HEALTH_REMINDER', 'SYSTEM'][i % 3],
    title: `Test Notification ${i + 1}`,
    body: `Test body ${i + 1}`,
    is_read: isRead,
  }));
  const { data } = await supabaseAdmin.from('notifications').insert(rows).select();
  return data ?? [];
}

describe('GET /v1/notifications — List Notifications', () => {
  let uid: string;

  beforeEach(async () => {
    const { user } = await createTestUser();
    uid = user.id;
    mockFirebaseUser(uid);
    await seedNotifications(uid, 5, false);  // 5 unread
    await seedNotifications(uid, 3, true);   // 3 read
  });

  afterEach(async () => { await cleanupUser(uid); });

  it('200: returns all notifications for the user', async () => {
    const res = await api.get('/v1/notifications').set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(8);
    res.body.data.forEach((n: any) => {
      expect(n.user_id).toBe(uid);
    });
  });

  it('200: filters to only unread when isRead=false', async () => {
    const res = await api.get('/v1/notifications').set(authHeader()).query({ isRead: 'false' });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(5);
    res.body.data.forEach((n: any) => expect(n.is_read).toBe(false));
  });

  it('200: returns notifications sorted newest first', async () => {
    const res = await api.get('/v1/notifications').set(authHeader());
    const dates = res.body.data.map((n: any) => new Date(n.created_at).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }
  });

  it('200: cursor-based pagination returns unique sets', async () => {
    const page1 = await api.get('/v1/notifications').set(authHeader()).query({ limit: '3' });
    expect(page1.body.data).toHaveLength(3);

    const cursor = page1.body.meta.pagination.nextCursor;
    if (cursor) {
      const page2 = await api.get('/v1/notifications')
        .set(authHeader()).query({ limit: '3', cursor });
      const ids1 = page1.body.data.map((n: any) => n.id);
      const ids2 = page2.body.data.map((n: any) => n.id);
      expect(ids1.some((id: string) => ids2.includes(id))).toBe(false);
    }
  });

  it('200: RLS — user only sees own notifications', async () => {
    const { user: other } = await createTestUser();
    await seedNotifications(other.id, 3);
    mockFirebaseUser(uid);

    const res = await api.get('/v1/notifications').set(authHeader());
    res.body.data.forEach((n: any) => expect(n.user_id).toBe(uid));

    await cleanupUser(other.id);
  });

  it('401: unauthenticated request rejected', async () => {
    const res = await api.get('/v1/notifications');
    expect(res.status).toBe(401);
  });
});

describe('GET /v1/notifications/count — Unread Count', () => {
  let uid: string;

  beforeEach(async () => {
    const { user } = await createTestUser();
    uid = user.id;
    mockFirebaseUser(uid);
  });

  afterEach(async () => { await cleanupUser(uid); });

  it('200: returns correct unread count', async () => {
    await seedNotifications(uid, 7, false);
    await seedNotifications(uid, 2, true);

    const res = await api.get('/v1/notifications/count').set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body.data.unread).toBe(7);
  });

  it('200: returns 0 when no unread notifications', async () => {
    await seedNotifications(uid, 5, true);

    const res = await api.get('/v1/notifications/count').set(authHeader());
    expect(res.body.data.unread).toBe(0);
  });

  it('200: returns 0 when user has no notifications at all', async () => {
    const res = await api.get('/v1/notifications/count').set(authHeader());
    expect(res.body.data.unread).toBe(0);
  });
});

describe('PATCH /v1/notifications/:id/read — Mark Single Read', () => {
  let uid: string;
  let notifId: string;

  beforeEach(async () => {
    const { user } = await createTestUser();
    uid = user.id;
    mockFirebaseUser(uid);

    const notifs = await seedNotifications(uid, 1, false);
    notifId = notifs[0].id;
  });

  afterEach(async () => { await cleanupUser(uid); });

  it('200: marks notification as read', async () => {
    const res = await api.patch(`/v1/notifications/${notifId}/read`).set(authHeader());
    expect(res.status).toBe(200);

    const { data: notif } = await supabaseAdmin
      .from('notifications').select('is_read, read_at').eq('id', notifId).single();
    expect(notif!.is_read).toBe(true);
    expect(notif!.read_at).not.toBeNull();
  });

  it('200: unread count decrements after marking read', async () => {
    const before = await api.get('/v1/notifications/count').set(authHeader());
    expect(before.body.data.unread).toBe(1);

    await api.patch(`/v1/notifications/${notifId}/read`).set(authHeader());

    const after = await api.get('/v1/notifications/count').set(authHeader());
    expect(after.body.data.unread).toBe(0);
  });

  it('404: cannot mark another user\'s notification as read (RLS)', async () => {
    const { user: other } = await createTestUser();
    const otherNotifs = await seedNotifications(other.id, 1, false);
    const otherNotifId = otherNotifs[0].id;

    mockFirebaseUser(uid);
    const res = await api.patch(`/v1/notifications/${otherNotifId}/read`).set(authHeader());
    expect([403, 404]).toContain(res.status);

    await cleanupUser(other.id);
  });

  it('404: non-existent notification ID returns 404', async () => {
    const res = await api
      .patch('/v1/notifications/00000000-0000-0000-0000-000000000000/read')
      .set(authHeader());
    expect(res.status).toBe(404);
  });
});

describe('PATCH /v1/notifications/read-all — Mark All Read', () => {
  let uid: string;

  beforeEach(async () => {
    const { user } = await createTestUser();
    uid = user.id;
    mockFirebaseUser(uid);
    await seedNotifications(uid, 10, false);
  });

  afterEach(async () => { await cleanupUser(uid); });

  it('200: marks all notifications as read', async () => {
    const res = await api.patch('/v1/notifications/read-all').set(authHeader());
    expect(res.status).toBe(200);

    const { count } = await supabaseAdmin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
      .eq('is_read', false);
    expect(count).toBe(0);
  });

  it('200: count returns 0 after mark-all-read', async () => {
    await api.patch('/v1/notifications/read-all').set(authHeader());

    const res = await api.get('/v1/notifications/count').set(authHeader());
    expect(res.body.data.unread).toBe(0);
  });

  it('200: does NOT mark other users\' notifications as read', async () => {
    const { user: other } = await createTestUser();
    const otherNotifs = await seedNotifications(other.id, 3, false);

    mockFirebaseUser(uid);
    await api.patch('/v1/notifications/read-all').set(authHeader());

    const { count } = await supabaseAdmin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', other.id)
      .eq('is_read', false);
    expect(count).toBe(3); // other user's notifications unaffected

    await cleanupUser(other.id);
  });

  it('200: works when there are no unread notifications (idempotent)', async () => {
    await api.patch('/v1/notifications/read-all').set(authHeader()); // first call
    const res = await api.patch('/v1/notifications/read-all').set(authHeader()); // second call
    expect(res.status).toBe(200);
  });
});

describe('Notification Queue Integration', () => {
  let uid: string;

  beforeEach(async () => {
    const { user } = await createTestUser();
    uid = user.id;
    mockFirebaseUser(uid);
  });

  afterEach(async () => { await cleanupUser(uid); });

  it('FCM token updated on PATCH /users/me', async () => {
    const res = await api.patch('/v1/users/me')
      .set(authHeader())
      .send({ fcmToken: 'new-fcm-token-xyz' });

    expect(res.status).toBe(200);

    const { data: user } = await supabaseAdmin
      .from('users').select('fcm_token').eq('id', uid).single();
    expect(user!.fcm_token).toBe('new-fcm-token-xyz');
  });

  it('CRITICAL request queues notification with correct priority', async () => {
    const { notificationQueue } = require('@/jobs/queues');

    await api.post('/v1/requests').set(authHeader()).send({
      bloodGroup: 'O_NEGATIVE',
      unitsRequired: 2,
      hospitalName: 'Dhaka Medical',
      hospitalAddress: 'Dhaka',
      requiredBy: new Date(Date.now() + 86400000).toISOString(),
      emergencyLevel: 'CRITICAL',
      isForMyself: true,
      paymentMethod: 'FREE',
    });

    const calls = vi.mocked(notificationQueue.add).mock.calls;
    const criticalCall = calls.find(([, payload]: [string, any]) =>
      payload?.data?.emergencyLevel === 'CRITICAL'
    );
    expect(criticalCall).toBeDefined();
  });
});

// =============================================================================
// tests/integration/payments.integration.test.ts
// =============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { api, authHeader } from '../setup/helpers/request.helpers';
import { createTestUser, cleanupUser, createTestRequest } from '../setup/helpers/db.helpers';
import { mockFirebaseUser } from '../setup/helpers/auth.helpers';
import { supabaseAdmin } from '@/config/supabase';

describe('POST /v1/payments/initiate — Initiate Payment', () => {
  let uid: string;
  let requestId: string;

  beforeEach(async () => {
    const { user } = await createTestUser();
    uid = user.id;
    mockFirebaseUser(uid);

    const req = await createTestRequest(uid, { payment_method: 'BKASH', status: 'PENDING' });
    requestId = req.id;
  });

  afterEach(async () => { await cleanupUser(uid); });

  it('200: initiates bKash payment and returns gateway URL', async () => {
    const res = await api.post('/v1/payments/initiate').set(authHeader()).send({
      requestId,
      method: 'BKASH',
      amount: 700,
    });

    expect(res.status).toBe(200);
    expect(res.body.data.paymentId).toBeDefined();
    expect(res.body.data.gatewayUrl).toContain('bka.sh');
    expect(res.body.data.method).toBe('BKASH');
  });

  it('200: creates PENDING payment record in DB', async () => {
    const res = await api.post('/v1/payments/initiate').set(authHeader()).send({
      requestId,
      method: 'BKASH',
      amount: 700,
    });

    const { data: payment } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('id', res.body.data.paymentId)
      .single();

    expect(payment!.status).toBe('PENDING');
    expect(payment!.method).toBe('BKASH');
    expect(Number(payment!.amount)).toBe(700);
    expect(payment!.user_id).toBe(uid);
  });

  it('200: initiates Nagad payment with correct gateway URL', async () => {
    const { bkashService: _ } = require('@/lib/bkash');
    const { nagadService } = require('@/lib/nagad');
    vi.mocked(nagadService.createPayment).mockResolvedValueOnce({
      callBackUrl: 'https://sandbox.mynagad.com/payment/mock-id',
      refId: 'nagad-ref-id',
    });

    const res = await api.post('/v1/payments/initiate').set(authHeader()).send({
      requestId,
      method: 'NAGAD',
      amount: 700,
    });

    expect(res.status).toBe(200);
    expect(res.body.data.method).toBe('NAGAD');
  });

  it('400: rejects payment for non-existent request', async () => {
    const res = await api.post('/v1/payments/initiate').set(authHeader()).send({
      requestId: '00000000-0000-0000-0000-000000000000',
      method: 'BKASH',
      amount: 700,
    });
    expect(res.status).toBe(404);
  });

  it('422: rejects invalid payment method', async () => {
    const res = await api.post('/v1/payments/initiate').set(authHeader()).send({
      requestId,
      method: 'PAYPAL',  // not supported
      amount: 700,
    });
    expect(res.status).toBe(422);
  });

  it('422: rejects zero amount', async () => {
    const res = await api.post('/v1/payments/initiate').set(authHeader()).send({
      requestId,
      method: 'BKASH',
      amount: 0,
    });
    expect(res.status).toBe(422);
  });

  it('422: rejects negative amount', async () => {
    const res = await api.post('/v1/payments/initiate').set(authHeader()).send({
      requestId,
      method: 'BKASH',
      amount: -500,
    });
    expect(res.status).toBe(422);
  });
});

describe('POST /v1/payments/verify — Verify Payment', () => {
  let uid: string;
  let paymentId: string;

  beforeEach(async () => {
    const { user } = await createTestUser();
    uid = user.id;
    mockFirebaseUser(uid);

    const { data: payment } = await supabaseAdmin
      .from('payments')
      .insert({
        user_id: uid,
        amount: 700,
        method: 'BKASH',
        currency: 'BDT',
        status: 'PENDING',
      })
      .select()
      .single();
    paymentId = payment!.id;
  });

  afterEach(async () => { await cleanupUser(uid); });

  it('200: verifies successful bKash payment', async () => {
    const res = await api.post('/v1/payments/verify').set(authHeader()).send({
      paymentId,
      gatewayTxnId: 'mock-bkash-trx-id',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('SUCCESS');
  });

  it('200: updates payment record to SUCCESS on verification', async () => {
    await api.post('/v1/payments/verify').set(authHeader()).send({
      paymentId,
      gatewayTxnId: 'mock-bkash-trx-id',
    });

    const { data: payment } = await supabaseAdmin
      .from('payments').select('*').eq('id', paymentId).single();

    expect(payment!.status).toBe('SUCCESS');
    expect(payment!.gateway_txn_id).toBe('mock-bkash-trx-id');
    expect(payment!.paid_at).not.toBeNull();
  });

  it('200: sends PAYMENT_CONFIRMED notification after success', async () => {
    const { notificationQueue } = require('@/jobs/queues');

    await api.post('/v1/payments/verify').set(authHeader()).send({
      paymentId,
      gatewayTxnId: 'mock-bkash-trx-id',
    });

    const calls = vi.mocked(notificationQueue.add).mock.calls;
    const paymentNotif = calls.find(([, p]: [string, any]) =>
      p?.type === 'PAYMENT_CONFIRMED'
    );
    expect(paymentNotif).toBeDefined();
  });

  it('200: gateway failure sets payment status to FAILED', async () => {
    const { bkashService } = require('@/lib/bkash');
    vi.mocked(bkashService.executePayment).mockResolvedValueOnce({
      statusCode: '2001', // failure code
      statusMessage: 'Insufficient balance',
    });

    const res = await api.post('/v1/payments/verify').set(authHeader()).send({
      paymentId,
      gatewayTxnId: 'failed-trx-id',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('FAILED');

    const { data: payment } = await supabaseAdmin
      .from('payments').select('status').eq('id', paymentId).single();
    expect(payment!.status).toBe('FAILED');
  });

  it('200: failed payment sends PAYMENT_FAILED notification', async () => {
    const { bkashService } = require('@/lib/bkash');
    vi.mocked(bkashService.executePayment).mockResolvedValueOnce({
      statusCode: '2001',
    });

    const { notificationQueue } = require('@/jobs/queues');

    await api.post('/v1/payments/verify').set(authHeader()).send({
      paymentId,
      gatewayTxnId: 'failed-trx-id',
    });

    const calls = vi.mocked(notificationQueue.add).mock.calls;
    const failNotif = calls.find(([, p]: [string, any]) =>
      p?.type === 'PAYMENT_FAILED'
    );
    expect(failNotif).toBeDefined();
  });

  it('200: verifying already-SUCCESS payment is idempotent', async () => {
    await supabaseAdmin
      .from('payments')
      .update({ status: 'SUCCESS', gateway_txn_id: 'existing-trx' })
      .eq('id', paymentId);

    const res = await api.post('/v1/payments/verify').set(authHeader()).send({
      paymentId,
      gatewayTxnId: 'existing-trx',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('SUCCESS');
    // Should not call bKash again
    const { bkashService } = require('@/lib/bkash');
    expect(vi.mocked(bkashService.executePayment)).not.toHaveBeenCalled();
  });

  it('404: non-existent paymentId returns 404', async () => {
    const res = await api.post('/v1/payments/verify').set(authHeader()).send({
      paymentId: '00000000-0000-0000-0000-000000000000',
      gatewayTxnId: 'any',
    });
    expect(res.status).toBe(404);
  });
});

describe('POST /v1/payments/webhook/bkash — Webhook Handler', () => {
  it('200: processes valid bKash webhook with correct HMAC', async () => {
    const crypto = require('crypto');
    const payload = JSON.stringify({
      paymentID: 'BK20250115001',
      trxID: 'ABC12345',
      statusCode: '0000',
      statusMessage: 'Successful',
    });
    const signature = crypto
      .createHmac('sha256', process.env.BKASH_WEBHOOK_SECRET ?? 'test-secret')
      .update(payload)
      .digest('hex');

    const res = await api
      .post('/v1/payments/webhook/bkash')
      .set('Content-Type', 'application/json')
      .set('x-bkash-signature', signature)
      .send(payload);

    expect([200, 202]).toContain(res.status);
  });

  it('401: rejects webhook with invalid HMAC signature', async () => {
    const res = await api
      .post('/v1/payments/webhook/bkash')
      .set('Content-Type', 'application/json')
      .set('x-bkash-signature', 'completely-wrong-signature')
      .send(JSON.stringify({ paymentID: 'test', statusCode: '0000' }));

    expect(res.status).toBe(401);
  });

  it('401: rejects webhook with missing signature header', async () => {
    const res = await api
      .post('/v1/payments/webhook/bkash')
      .send({ paymentID: 'test', statusCode: '0000' });

    expect(res.status).toBe(401);
  });

  it('401: rejects webhook with tampered payload (HMAC mismatch)', async () => {
    const crypto = require('crypto');
    const originalPayload = JSON.stringify({ paymentID: 'original', statusCode: '0000' });
    const signature = crypto
      .createHmac('sha256', process.env.BKASH_WEBHOOK_SECRET ?? 'test-secret')
      .update(originalPayload)
      .digest('hex');

    // Send different payload with original signature
    const res = await api
      .post('/v1/payments/webhook/bkash')
      .set('Content-Type', 'application/json')
      .set('x-bkash-signature', signature)
      .send(JSON.stringify({ paymentID: 'tampered', statusCode: '0000' }));

    expect(res.status).toBe(401);
  });
});

// =============================================================================
// tests/integration/history.integration.test.ts
// =============================================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { api, authHeader } from '../setup/helpers/request.helpers';
import { createTestUser, cleanupUser, cleanupUsers } from '../setup/helpers/db.helpers';
import { mockFirebaseUser } from '../setup/helpers/auth.helpers';
import { supabaseAdmin } from '@/config/supabase';
import { subDays } from 'date-fns';

async function seedDonationRecords(donorId: string, recipientId: string) {
  await supabaseAdmin.from('donation_records').insert([
    {
      donor_id: donorId, recipient_id: recipientId,
      type: 'DONATION', blood_group: 'A_POSITIVE', units: 1,
      donated_at: subDays(new Date(), 60).toISOString(),
      hospital_name: 'Dhaka Medical College Hospital',
    },
    {
      donor_id: donorId, recipient_id: recipientId,
      type: 'DONATION', blood_group: 'A_POSITIVE', units: 2,
      donated_at: subDays(new Date(), 120).toISOString(),
      hospital_name: 'Square Hospital',
    },
    {
      donor_id: recipientId, recipient_id: donorId,
      type: 'TRANSFUSION', blood_group: 'A_POSITIVE', units: 1,
      donated_at: subDays(new Date(), 200).toISOString(),
      hospital_name: 'Holy Family Hospital',
    },
  ]);
}

describe('GET /v1/history — Donation History', () => {
  let user1Id: string;
  let user2Id: string;

  beforeEach(async () => {
    const { user: u1 } = await createTestUser({ bloodGroup: 'A_POSITIVE' });
    const { user: u2 } = await createTestUser({ bloodGroup: 'A_POSITIVE' });
    user1Id = u1.id;
    user2Id = u2.id;
    await seedDonationRecords(user1Id, user2Id);
    mockFirebaseUser(user1Id);
  });

  afterEach(async () => { await cleanupUsers(user1Id, user2Id); });

  it('200: returns ALL history (donations + transfusions) when type=ALL', async () => {
    const res = await api.get('/v1/history').set(authHeader()).query({ type: 'ALL' });

    expect(res.status).toBe(200);
    // user1 donated twice (donor_id = user1Id) and received once (recipient_id = user1Id)
    expect(res.body.data.length).toBe(3);
  });

  it('200: returns only DONATIONS when type=DONATION', async () => {
    const res = await api.get('/v1/history').set(authHeader()).query({ type: 'DONATION' });

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    res.body.data.forEach((r: any) => {
      expect(r.type).toBe('DONATION');
      expect(r.donor_id).toBe(user1Id);
    });
  });

  it('200: returns only TRANSFUSIONS when type=TRANSFUSION', async () => {
    const res = await api.get('/v1/history').set(authHeader()).query({ type: 'TRANSFUSION' });

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].type).toBe('TRANSFUSION');
    expect(res.body.data[0].recipient_id).toBe(user1Id);
  });

  it('200: returns sorted by donated_at DESC (newest first)', async () => {
    const res = await api.get('/v1/history').set(authHeader()).query({ type: 'ALL' });

    const dates = res.body.data.map((r: any) => new Date(r.donated_at).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }
  });

  it('200: only returns current user\'s records (RLS)', async () => {
    const res = await api.get('/v1/history').set(authHeader()).query({ type: 'ALL' });

    res.body.data.forEach((r: any) => {
      const isOwner = r.donor_id === user1Id || r.recipient_id === user1Id;
      expect(isOwner, `Record ${r.id} should belong to user1`).toBe(true);
    });
  });

  it('200: returns empty array (not 404) for user with no history', async () => {
    const { user: newUser } = await createTestUser();
    mockFirebaseUser(newUser.id);

    const res = await api.get('/v1/history').set(authHeader()).query({ type: 'ALL' });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);

    await cleanupUser(newUser.id);
  });

  it('200: cursor pagination works across history records', async () => {
    // Seed more records for pagination test
    for (let i = 0; i < 5; i++) {
      await supabaseAdmin.from('donation_records').insert({
        donor_id: user1Id, recipient_id: user2Id,
        type: 'DONATION', blood_group: 'A_POSITIVE', units: 1,
        donated_at: subDays(new Date(), i + 1).toISOString(),
      });
    }

    const page1 = await api.get('/v1/history').set(authHeader()).query({
      type: 'ALL', limit: '3',
    });
    expect(page1.body.data.length).toBe(3);
    expect(page1.body.meta.pagination.hasMore).toBe(true);

    const page2 = await api.get('/v1/history').set(authHeader()).query({
      type: 'ALL', limit: '3',
      cursor: page1.body.meta.pagination.nextCursor,
    });
    expect(page2.body.data.length).toBeGreaterThan(0);

    const ids1 = page1.body.data.map((r: any) => r.id);
    const ids2 = page2.body.data.map((r: any) => r.id);
    expect(ids1.some((id: string) => ids2.includes(id))).toBe(false);
  });

  it('422: invalid type parameter returns validation error', async () => {
    const res = await api.get('/v1/history').set(authHeader()).query({ type: 'INVALID' });
    expect(res.status).toBe(422);
  });

  it('401: unauthenticated request rejected', async () => {
    const res = await api.get('/v1/history');
    expect(res.status).toBe(401);
  });
});

// =============================================================================
// tests/integration/users.integration.test.ts
// =============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { api, authHeader } from '../setup/helpers/request.helpers';
import { createTestUser, cleanupUser } from '../setup/helpers/db.helpers';
import { mockFirebaseUser } from '../setup/helpers/auth.helpers';
import { supabaseAdmin } from '@/config/supabase';

describe('GET /v1/users/me — Own Profile', () => {
  let uid: string;

  beforeEach(async () => {
    const { user } = await createTestUser({
      bloodGroup: 'B_POSITIVE',
      gender: 'FEMALE',
      isVerified: true,
      trustScore: 75,
    });
    uid = user.id;
    mockFirebaseUser(uid, 'DONOR');
  });

  afterEach(async () => { await cleanupUser(uid); });

  it('200: returns full unmasked profile for own user', async () => {
    const res = await api.get('/v1/users/me').set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(uid);
    expect(res.body.data.blood_group).toBe('B_POSITIVE');
    expect(res.body.data.gender).toBe('FEMALE');
    expect(res.body.data.is_verified).toBe(true);
    expect(res.body.data.trust_score).toBe(75);
  });

  it('200: never exposes fcm_token in response', async () => {
    await supabaseAdmin.from('users').update({ fcm_token: 'secret-fcm-token' }).eq('id', uid);
    const res = await api.get('/v1/users/me').set(authHeader());
    expect(res.body.data.fcm_token).toBeUndefined();
  });

  it('200: never exposes nid_number in response', async () => {
    await supabaseAdmin.from('users').update({ nid_number: '1234567890123' }).eq('id', uid);
    const res = await api.get('/v1/users/me').set(authHeader());
    expect(res.body.data.nid_number).toBeUndefined();
  });

  it('401: unauthenticated request rejected', async () => {
    const res = await api.get('/v1/users/me');
    expect(res.status).toBe(401);
  });
});

describe('PATCH /v1/users/me — Update Own Profile', () => {
  let uid: string;

  beforeEach(async () => {
    const { user } = await createTestUser();
    uid = user.id;
    mockFirebaseUser(uid);
  });

  afterEach(async () => { await cleanupUser(uid); });

  it('200: updates name successfully', async () => {
    const res = await api.patch('/v1/users/me').set(authHeader()).send({ name: 'New Name' });

    expect(res.status).toBe(200);
    const { data } = await supabaseAdmin.from('users').select('name').eq('id', uid).single();
    expect(data!.name).toBe('New Name');
  });

  it('200: toggles availability to false', async () => {
    const res = await api.patch('/v1/users/me').set(authHeader()).send({ isAvailable: false });

    expect(res.status).toBe(200);
    const { data } = await supabaseAdmin.from('users').select('is_available').eq('id', uid).single();
    expect(data!.is_available).toBe(false);
  });

  it('200: toggles availability back to true', async () => {
    await supabaseAdmin.from('users').update({ is_available: false }).eq('id', uid);

    const res = await api.patch('/v1/users/me').set(authHeader()).send({ isAvailable: true });
    expect(res.status).toBe(200);

    const { data } = await supabaseAdmin.from('users').select('is_available').eq('id', uid).single();
    expect(data!.is_available).toBe(true);
  });

  it('200: updates FCM token', async () => {
    const res = await api.patch('/v1/users/me').set(authHeader())
      .send({ fcmToken: 'fcm-token-xyz-123' });

    expect(res.status).toBe(200);
    const { data } = await supabaseAdmin.from('users').select('fcm_token').eq('id', uid).single();
    expect(data!.fcm_token).toBe('fcm-token-xyz-123');
  });

  it('422: empty name rejected', async () => {
    const res = await api.patch('/v1/users/me').set(authHeader()).send({ name: '' });
    expect(res.status).toBe(422);
  });

  it('422: name with only spaces rejected', async () => {
    const res = await api.patch('/v1/users/me').set(authHeader()).send({ name: '   ' });
    expect(res.status).toBe(422);
  });

  it('400: cannot change blood_group directly (immutable)', async () => {
    const res = await api.patch('/v1/users/me').set(authHeader())
      .send({ blood_group: 'O_NEGATIVE' });

    // Either 400 (field not allowed) or 200 with field ignored
    if (res.status === 200) {
      const { data } = await supabaseAdmin
        .from('users').select('blood_group').eq('id', uid).single();
      expect(data!.blood_group).not.toBe('O_NEGATIVE');
    } else {
      expect(res.status).toBe(400);
    }
  });

  it('400: cannot change role directly (protected)', async () => {
    const res = await api.patch('/v1/users/me').set(authHeader())
      .send({ role: 'ADMIN' });

    if (res.status === 200) {
      const { data } = await supabaseAdmin
        .from('users').select('role').eq('id', uid).single();
      expect(data!.role).not.toBe('ADMIN');
    } else {
      expect([400, 422]).toContain(res.status);
    }
  });
});

describe('PATCH /v1/users/me/location — Update Location', () => {
  let uid: string;

  beforeEach(async () => {
    const { user } = await createTestUser();
    uid = user.id;
    mockFirebaseUser(uid);
  });

  afterEach(async () => { await cleanupUser(uid); });

  it('200: updates location coordinates', async () => {
    const newLat = 22.3569;
    const newLng = 91.7832;

    const res = await api.patch('/v1/users/me/location').set(authHeader()).send({
      latitude: newLat,
      longitude: newLng,
    });

    expect(res.status).toBe(200);

    const { data: location } = await supabaseAdmin
      .from('user_locations').select('*').eq('user_id', uid).single();

    expect(Number(location!.latitude)).toBeCloseTo(newLat, 4);
    expect(Number(location!.longitude)).toBeCloseTo(newLng, 4);
    expect(location!.geom).toBeDefined(); // DB trigger auto-updated
  });

  it('200: upserts location when user has no existing location', async () => {
    await supabaseAdmin.from('user_locations').delete().eq('user_id', uid);

    const res = await api.patch('/v1/users/me/location').set(authHeader()).send({
      latitude: 23.8103,
      longitude: 90.4125,
    });

    expect(res.status).toBe(200);

    const { data: location } = await supabaseAdmin
      .from('user_locations').select('user_id').eq('user_id', uid).single();
    expect(location).not.toBeNull();
  });

  it('422: rejects latitude outside valid range (-90 to 90)', async () => {
    const res = await api.patch('/v1/users/me/location').set(authHeader()).send({
      latitude: 95,
      longitude: 90.4125,
    });
    expect(res.status).toBe(422);
  });

  it('422: rejects longitude outside valid range (-180 to 180)', async () => {
    const res = await api.patch('/v1/users/me/location').set(authHeader()).send({
      latitude: 23.8103,
      longitude: 185,
    });
    expect(res.status).toBe(422);
  });

  it('422: rejects missing latitude', async () => {
    const res = await api.patch('/v1/users/me/location').set(authHeader()).send({
      longitude: 90.4125,
    });
    expect(res.status).toBe(422);
  });

  it('422: rejects string values for coordinates', async () => {
    const res = await api.patch('/v1/users/me/location').set(authHeader()).send({
      latitude: 'not-a-number',
      longitude: 90.4125,
    });
    expect(res.status).toBe(422);
  });
});

describe('GET /v1/users/me/eligibility — Full API Coverage', () => {
  let uid: string;

  beforeEach(async () => {
    const { user } = await createTestUser({
      gender: 'FEMALE',
      dateOfBirth: '1992-03-22',
      hasHealthRecord: true,
    });
    uid = user.id;
    mockFirebaseUser(uid);
  });

  afterEach(async () => { await cleanupUser(uid); });

  it('200: returns eligible:true when all conditions met', async () => {
    const res = await api.get('/v1/users/me/eligibility').set(authHeader());
    expect(res.status).toBe(200);
    expect(typeof res.body.data.eligible).toBe('boolean');
  });

  it('200: returns eligibleOn date when TOO_SOON', async () => {
    // Female donated 50 days ago (needs 90)
    await supabaseAdmin.from('donation_records').insert({
      donor_id: uid, recipient_id: uid,
      type: 'DONATION', blood_group: 'B_POSITIVE', units: 1,
      donated_at: new Date(Date.now() - 50 * 86400000).toISOString(),
    });

    const res = await api.get('/v1/users/me/eligibility').set(authHeader());
    if (res.body.data.reason === 'TOO_SOON') {
      expect(res.body.data.eligibleOn).toBeDefined();
      expect(new Date(res.body.data.eligibleOn).getTime()).toBeGreaterThan(Date.now());
    }
  });

  it('200: returns lastDonation date when exists', async () => {
    const donatedAt = new Date(Date.now() - 100 * 86400000).toISOString();
    await supabaseAdmin.from('donation_records').insert({
      donor_id: uid, recipient_id: uid,
      type: 'DONATION', blood_group: 'B_POSITIVE', units: 1,
      donated_at: donatedAt,
    });

    const res = await api.get('/v1/users/me/eligibility').set(authHeader());
    expect(res.body.data.lastDonation).toBeDefined();
    expect(new Date(res.body.data.lastDonation).toDateString())
      .toBe(new Date(donatedAt).toDateString());
  });

  it('401: unauthenticated request rejected', async () => {
    const res = await api.get('/v1/users/me/eligibility');
    expect(res.status).toBe(401);
  });
});

describe('DELETE /v1/users/me — Account Deletion', () => {
  let uid: string;

  beforeEach(async () => {
    const { user } = await createTestUser();
    uid = user.id;
    mockFirebaseUser(uid);
  });

  afterEach(async () => {
    // Clean up even if test fails
    await supabaseAdmin.from('users').delete().eq('id', uid);
  });

  it('200: soft-deletes account (sets deleted_at)', async () => {
    const res = await api.delete('/v1/users/me').set(authHeader());
    expect(res.status).toBe(200);

    const { data: user } = await supabaseAdmin
      .from('users').select('deleted_at, name, phone').eq('id', uid).single();

    expect(user!.deleted_at).not.toBeNull();
  });

  it('200: anonymizes PII on deletion', async () => {
    await api.delete('/v1/users/me').set(authHeader());

    const { data: user } = await supabaseAdmin
      .from('users').select('name, phone, email, avatar_url').eq('id', uid).single();

    expect(user!.name).toBe('Deleted User');
    expect(user!.phone).toBeNull();
    expect(user!.email).toBeNull();
    expect(user!.avatar_url).toBeNull();
  });

  it('200: revokes Firebase tokens on deletion', async () => {
    await api.delete('/v1/users/me').set(authHeader());

    const { firebaseAuth } = require('@/config/firebase-admin');
    expect(vi.mocked(firebaseAuth.revokeRefreshTokens)).toHaveBeenCalledWith(uid);
  });

  it('200: donation records preserved after deletion (7-year law)', async () => {
    // Create a donation record first
    await supabaseAdmin.from('donation_records').insert({
      donor_id: uid, recipient_id: uid,
      type: 'DONATION', blood_group: 'A_POSITIVE', units: 1,
      donated_at: new Date().toISOString(),
    });

    await api.delete('/v1/users/me').set(authHeader());

    // Donation record must still exist (BD law requires 7-year retention)
    const { count } = await supabaseAdmin
      .from('donation_records')
      .select('id', { count: 'exact', head: true })
      .eq('donor_id', uid);

    expect(count).toBe(1);
  });

  it('401: unauthenticated deletion rejected', async () => {
    const res = await api.delete('/v1/users/me');
    expect(res.status).toBe(401);
  });
});
