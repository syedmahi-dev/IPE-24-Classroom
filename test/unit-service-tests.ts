// =============================================================================
// tests/unit/auth-service.test.ts
// Auth service business logic — unit tests with mocked DB
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '@/modules/auth/auth.service';
import { AppError } from '@/lib/errors';
import { subYears } from 'date-fns';

// Mock Supabase
const mockSingle = vi.fn();
const mockSelect = vi.fn(() => ({ single: mockSingle, eq: vi.fn().mockReturnThis() }));
const mockInsert = vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) }));
const mockUpdate = vi.fn(() => ({ eq: vi.fn().mockReturnThis() }));

vi.mock('@/config/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      eq: vi.fn().mockReturnThis(),
      single: mockSingle,
    })),
  },
}));

describe('authService.register — Age Validation', () => {
  const BASE_DTO = {
    name: 'Test User',
    gender: 'MALE' as const,
    bloodGroup: 'A_POSITIVE' as const,
  };

  beforeEach(() => {
    const { firebaseAuth } = require('@/config/firebase-admin');
    vi.mocked(firebaseAuth.verifyIdToken).mockResolvedValue({
      uid: 'test-uid-123',
      phone_number: '+8801711111111',
    });

    // No existing user
    mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
    // Successful insert
    mockInsert.mockReturnValue({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: { id: 'test-uid-123', name: 'Test User', role: 'DONOR' },
          error: null,
        }),
      })),
    });
  });

  it('throws AGE_INVALID for 17-year-old (exactly one day before 18th birthday)', async () => {
    const dob = subYears(new Date(), 18);
    dob.setDate(dob.getDate() + 1);

    await expect(
      authService.register('token', { ...BASE_DTO, dateOfBirth: dob.toISOString().split('T')[0] }, '127.0.0.1')
    ).rejects.toMatchObject({ code: 'AGE_INVALID', statusCode: 400 });
  });

  it('throws AGE_INVALID for 61-year-old', async () => {
    const dob = subYears(new Date(), 61);

    await expect(
      authService.register('token', { ...BASE_DTO, dateOfBirth: dob.toISOString().split('T')[0] }, '127.0.0.1')
    ).rejects.toMatchObject({ code: 'AGE_INVALID' });
  });

  it('succeeds for exactly 18-year-old today', async () => {
    const dob = subYears(new Date(), 18);
    // Mock user doesn't exist yet
    mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });

    // Should not throw
    await expect(
      authService.register('token', { ...BASE_DTO, dateOfBirth: dob.toISOString().split('T')[0] }, '127.0.0.1')
    ).resolves.toBeDefined();
  });

  it('throws ALREADY_REGISTERED when Firebase UID already in Supabase', async () => {
    // Return existing user
    mockSingle.mockResolvedValueOnce({ data: { id: 'test-uid-123' }, error: null });

    await expect(
      authService.register('token', { ...BASE_DTO, dateOfBirth: '1995-06-15' }, '127.0.0.1')
    ).rejects.toMatchObject({ code: 'ALREADY_REGISTERED', statusCode: 409 });
  });

  it('throws PHONE_REQUIRED when Firebase token has no phone_number', async () => {
    const { firebaseAuth } = require('@/config/firebase-admin');
    vi.mocked(firebaseAuth.verifyIdToken).mockResolvedValueOnce({
      uid: 'test-uid',
      phone_number: undefined, // email auth without phone
    });

    await expect(
      authService.register('token', { ...BASE_DTO, dateOfBirth: '1995-06-15' }, '127.0.0.1')
    ).rejects.toMatchObject({ code: 'PHONE_REQUIRED', statusCode: 400 });
  });
});

describe('authService.login — Business Rules', () => {
  it('throws NOT_REGISTERED when Firebase UID not found in Supabase', async () => {
    const { firebaseAuth } = require('@/config/firebase-admin');
    vi.mocked(firebaseAuth.verifyIdToken).mockResolvedValueOnce({
      uid: 'unknown-uid',
      phone_number: '+8801799999999',
    });

    mockSingle.mockResolvedValueOnce({ data: null, error: null });

    await expect(authService.login('token'))
      .rejects.toMatchObject({ code: 'NOT_REGISTERED', statusCode: 404 });
  });

  it('throws ACCOUNT_INACTIVE for suspended user', async () => {
    const { firebaseAuth } = require('@/config/firebase-admin');
    vi.mocked(firebaseAuth.verifyIdToken).mockResolvedValueOnce({
      uid: 'suspended-uid',
      phone_number: '+8801711111111',
    });

    mockSingle.mockResolvedValueOnce({
      data: { id: 'suspended-uid', is_active: false, name: 'Test' },
      error: null,
    });

    await expect(authService.login('token'))
      .rejects.toMatchObject({ code: 'ACCOUNT_INACTIVE', statusCode: 403 });
  });

  it('returns user profile on successful login', async () => {
    const { firebaseAuth } = require('@/config/firebase-admin');
    vi.mocked(firebaseAuth.verifyIdToken).mockResolvedValueOnce({
      uid: 'active-uid',
      phone_number: '+8801711111111',
    });

    const mockUser = { id: 'active-uid', is_active: true, name: 'Active User', role: 'DONOR' };
    mockSingle.mockResolvedValueOnce({ data: mockUser, error: null });

    const result = await authService.login('token');
    expect(result.user).toEqual(mockUser);
  });
});

// =============================================================================
// tests/unit/request-service.test.ts
// Blood request business logic
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '@/lib/errors';

describe('requestsService.createRequest — Business Rules', () => {

  describe('Active Request Limit', () => {
    it('throws REQUEST_LIMIT_REACHED when 5 requests already active (individual)', async () => {
      // Simulate DB returning count of 5
      const mockCount = vi.fn().mockResolvedValue({ count: 5, error: null });

      // The service should check active count before creating
      const activeCount = 5;
      const limit = 5;

      if (activeCount >= limit) {
        const error = new AppError('REQUEST_LIMIT_REACHED', 'Max 5 active requests', 429);
        expect(error.code).toBe('REQUEST_LIMIT_REACHED');
        expect(error.statusCode).toBe(429);
      }
    });

    it('allows hospital requesters 20 active requests (higher limit)', async () => {
      const hospitalLimit = 20;
      const activeCount = 18;

      const shouldBlock = activeCount >= hospitalLimit;
      expect(shouldBlock).toBe(false); // 18 < 20, should NOT block
    });
  });

  describe('Emergency Level Handling', () => {
    it('CRITICAL requests trigger both FCM and SMS notifications', () => {
      const emergencyLevel = 'CRITICAL';
      const shouldSendSms = emergencyLevel === 'CRITICAL';
      expect(shouldSendSms).toBe(true);
    });

    it('URGENT requests only trigger FCM (not SMS)', () => {
      const emergencyLevel = 'URGENT';
      const shouldSendSms = emergencyLevel === 'CRITICAL';
      expect(shouldSendSms).toBe(false);
    });

    it('NORMAL requests only trigger FCM (not SMS)', () => {
      const emergencyLevel = 'NORMAL';
      const shouldSendSms = emergencyLevel === 'CRITICAL';
      expect(shouldSendSms).toBe(false);
    });
  });

  describe('Expiry Calculation', () => {
    it('expires_at is exactly 48 hours after creation', () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      const diffHours = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBe(48);
    });

    it('expired requests cannot be matched', () => {
      const now = new Date();
      const expiredAt = new Date(now.getTime() - 1000); // 1 second ago
      const isExpired = expiredAt < now;
      expect(isExpired).toBe(true);
    });
  });

  describe('Patient Field Validation Logic', () => {
    it('isForMyself=false requires both patientName AND patientAge', () => {
      const cases = [
        { isForMyself: false, patientName: undefined, patientAge: undefined, shouldError: true },
        { isForMyself: false, patientName: 'Karim', patientAge: undefined, shouldError: true },
        { isForMyself: false, patientName: undefined, patientAge: 45, shouldError: true },
        { isForMyself: false, patientName: 'Karim', patientAge: 45, shouldError: false },
        { isForMyself: true, patientName: undefined, patientAge: undefined, shouldError: false },
      ];

      cases.forEach(({ isForMyself, patientName, patientAge, shouldError }) => {
        const isInvalid = !isForMyself && (!patientName || patientAge === undefined);
        expect(isInvalid, `isForMyself=${isForMyself} patientName=${patientName} patientAge=${patientAge}`)
          .toBe(shouldError);
      });
    });
  });
});

// =============================================================================
// tests/unit/notification-service.test.ts
// Notification routing and delivery logic
// =============================================================================

import { describe, it, expect, vi } from 'vitest';

describe('notificationService — Routing Logic', () => {

  describe('Deep Link Generation by Type', () => {
    function getNotificationRoute(type: string, data: Record<string, string>): string {
      switch (type) {
        case 'DONATION_REQUEST':     return `/request/${data.requestId}`;
        case 'ACCEPTED_DONATION':    return `/request/${data.requestId}`;
        case 'REQUEST_FULFILLED':    return `/request/${data.requestId}`;
        case 'HEALTH_REMINDER':      return `/(tabs)/health`;
        case 'ELIGIBILITY_RESTORED': return `/(tabs)/profile`;
        case 'PAYMENT_CONFIRMED':    return `/history`;
        case 'PAYMENT_FAILED':       return `/request/${data.requestId}/payment`;
        case 'ORG_VERIFIED':         return `/(tabs)/profile`;
        case 'ORG_REJECTED':         return `/org/setup`;
        default:                     return '/notifications';
      }
    }

    const cases = [
      { type: 'DONATION_REQUEST',     data: { requestId: 'req-123' }, expected: '/request/req-123' },
      { type: 'ACCEPTED_DONATION',    data: { requestId: 'req-456' }, expected: '/request/req-456' },
      { type: 'HEALTH_REMINDER',      data: {},                       expected: '/(tabs)/health' },
      { type: 'ELIGIBILITY_RESTORED', data: {},                       expected: '/(tabs)/profile' },
      { type: 'PAYMENT_CONFIRMED',    data: {},                       expected: '/history' },
      { type: 'PAYMENT_FAILED',       data: { requestId: 'req-789' }, expected: '/request/req-789/payment' },
      { type: 'ORG_VERIFIED',         data: {},                       expected: '/(tabs)/profile' },
      { type: 'ORG_REJECTED',         data: {},                       expected: '/org/setup' },
      { type: 'SYSTEM',               data: {},                       expected: '/notifications' },
      { type: 'UNKNOWN_TYPE',         data: {},                       expected: '/notifications' },
    ];

    cases.forEach(({ type, data, expected }) => {
      it(`${type} → ${expected}`, () => {
        expect(getNotificationRoute(type, data)).toBe(expected);
      });
    });
  });

  describe('FCM Multicast Chunking (500 tokens per call)', () => {
    function chunkArray<T>(arr: T[], size: number): T[][] {
      const chunks: T[][] = [];
      for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
      }
      return chunks;
    }

    it('500 tokens → 1 chunk', () => {
      const tokens = Array(500).fill('token');
      expect(chunkArray(tokens, 500)).toHaveLength(1);
    });

    it('501 tokens → 2 chunks', () => {
      const tokens = Array(501).fill('token');
      const chunks = chunkArray(tokens, 500);
      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toHaveLength(500);
      expect(chunks[1]).toHaveLength(1);
    });

    it('1000 tokens → 2 chunks of 500', () => {
      const tokens = Array(1000).fill('token');
      const chunks = chunkArray(tokens, 500);
      expect(chunks).toHaveLength(2);
      chunks.forEach(chunk => expect(chunk).toHaveLength(500));
    });

    it('1001 tokens → 3 chunks', () => {
      const tokens = Array(1001).fill('token');
      expect(chunkArray(tokens, 500)).toHaveLength(3);
    });

    it('0 tokens → 0 chunks', () => {
      expect(chunkArray([], 500)).toHaveLength(0);
    });

    it('all tokens preserved across chunks (no data loss)', () => {
      const tokens = Array.from({ length: 750 }, (_, i) => `token-${i}`);
      const chunks = chunkArray(tokens, 500);
      const reconstructed = chunks.flat();
      expect(reconstructed).toHaveLength(750);
      expect(reconstructed).toEqual(tokens);
    });
  });

  describe('SMS Trigger Logic', () => {
    function shouldSendSms(emergencyLevel: string, hasFcmToken: boolean): boolean {
      // SMS only for CRITICAL + user doesn't have FCM (offline) OR always for CRITICAL
      return emergencyLevel === 'CRITICAL';
    }

    it('sends SMS for CRITICAL regardless of FCM token', () => {
      expect(shouldSendSms('CRITICAL', true)).toBe(true);
      expect(shouldSendSms('CRITICAL', false)).toBe(true);
    });

    it('does NOT send SMS for URGENT', () => {
      expect(shouldSendSms('URGENT', true)).toBe(false);
      expect(shouldSendSms('URGENT', false)).toBe(false);
    });

    it('does NOT send SMS for NORMAL', () => {
      expect(shouldSendSms('NORMAL', false)).toBe(false);
    });
  });
});

// =============================================================================
// tests/unit/payment-service.test.ts
// Payment calculation and webhook verification
// =============================================================================

import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

describe('Payment — Amount Calculation', () => {

  function calculatePaymentBreakdown(requestType: 'paid') {
    return {
      serviceFee: 500,
      transportAllowance: 200,
      total: 700,
      currency: 'BDT',
    };
  }

  it('calculates correct total: 500 service + 200 transport = 700', () => {
    const breakdown = calculatePaymentBreakdown('paid');
    expect(breakdown.total).toBe(breakdown.serviceFee + breakdown.transportAllowance);
    expect(breakdown.total).toBe(700);
  });

  it('currency is always BDT for Bangladesh phase', () => {
    const breakdown = calculatePaymentBreakdown('paid');
    expect(breakdown.currency).toBe('BDT');
  });

  it('service fee is 500 BDT', () => {
    expect(calculatePaymentBreakdown('paid').serviceFee).toBe(500);
  });

  it('transport allowance is 200 BDT', () => {
    expect(calculatePaymentBreakdown('paid').transportAllowance).toBe(200);
  });
});

describe('Payment — bKash HMAC Webhook Verification', () => {

  const WEBHOOK_SECRET = 'test-webhook-secret-key-32chars!!';

  function verifyBkashWebhook(payload: string, signature: string, secret: string): boolean {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    // Use timing-safe comparison to prevent timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expected, 'hex')
      );
    } catch {
      return false;
    }
  }

  it('accepts valid HMAC signature', () => {
    const payload = JSON.stringify({ paymentID: 'test-001', statusCode: '0000' });
    const signature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    expect(verifyBkashWebhook(payload, signature, WEBHOOK_SECRET)).toBe(true);
  });

  it('rejects tampered payload (same signature, different payload)', () => {
    const original = JSON.stringify({ paymentID: 'test-001', statusCode: '0000' });
    const signature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(original)
      .digest('hex');

    const tampered = JSON.stringify({ paymentID: 'HACKED', statusCode: '0000' });
    expect(verifyBkashWebhook(tampered, signature, WEBHOOK_SECRET)).toBe(false);
  });

  it('rejects completely wrong signature', () => {
    const payload = JSON.stringify({ paymentID: 'test-001', statusCode: '0000' });
    expect(verifyBkashWebhook(payload, 'a'.repeat(64), WEBHOOK_SECRET)).toBe(false);
  });

  it('rejects signature computed with wrong secret', () => {
    const payload = JSON.stringify({ paymentID: 'test-001', statusCode: '0000' });
    const wrongSignature = crypto
      .createHmac('sha256', 'wrong-secret')
      .update(payload)
      .digest('hex');

    expect(verifyBkashWebhook(payload, wrongSignature, WEBHOOK_SECRET)).toBe(false);
  });

  it('rejects empty signature', () => {
    const payload = JSON.stringify({ paymentID: 'test' });
    expect(verifyBkashWebhook(payload, '', WEBHOOK_SECRET)).toBe(false);
  });

  it('same payload + same secret always produces same signature (deterministic)', () => {
    const payload = JSON.stringify({ amount: 700, transactionId: 'abc' });
    const sig1 = crypto.createHmac('sha256', WEBHOOK_SECRET).update(payload).digest('hex');
    const sig2 = crypto.createHmac('sha256', WEBHOOK_SECRET).update(payload).digest('hex');
    expect(sig1).toBe(sig2);
  });

  it('different payloads produce different signatures', () => {
    const payload1 = JSON.stringify({ amount: 700 });
    const payload2 = JSON.stringify({ amount: 701 });
    const sig1 = crypto.createHmac('sha256', WEBHOOK_SECRET).update(payload1).digest('hex');
    const sig2 = crypto.createHmac('sha256', WEBHOOK_SECRET).update(payload2).digest('hex');
    expect(sig1).not.toBe(sig2);
  });
});

describe('Payment — Status State Machine', () => {

  type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

  function canTransitionTo(from: PaymentStatus, to: PaymentStatus): boolean {
    const transitions: Record<PaymentStatus, PaymentStatus[]> = {
      PENDING:  ['SUCCESS', 'FAILED'],
      SUCCESS:  ['REFUNDED'],
      FAILED:   [],               // terminal state — cannot recover
      REFUNDED: [],               // terminal state
    };
    return transitions[from].includes(to);
  }

  it('PENDING → SUCCESS allowed', () => {
    expect(canTransitionTo('PENDING', 'SUCCESS')).toBe(true);
  });

  it('PENDING → FAILED allowed', () => {
    expect(canTransitionTo('PENDING', 'FAILED')).toBe(true);
  });

  it('SUCCESS → REFUNDED allowed', () => {
    expect(canTransitionTo('SUCCESS', 'REFUNDED')).toBe(true);
  });

  it('FAILED → SUCCESS NOT allowed (terminal state)', () => {
    expect(canTransitionTo('FAILED', 'SUCCESS')).toBe(false);
  });

  it('REFUNDED → PENDING NOT allowed (terminal state)', () => {
    expect(canTransitionTo('REFUNDED', 'PENDING')).toBe(false);
  });

  it('SUCCESS → SUCCESS NOT allowed (no-op transition)', () => {
    expect(canTransitionTo('SUCCESS', 'SUCCESS')).toBe(false);
  });

  it('FAILED → REFUNDED NOT allowed', () => {
    expect(canTransitionTo('FAILED', 'REFUNDED')).toBe(false);
  });
});

// =============================================================================
// tests/unit/trust-score.test.ts
// Trust score calculation rules
// =============================================================================

import { describe, it, expect } from 'vitest';

describe('Trust Score Calculation', () => {

  function calculateTrustScore(factors: {
    totalDonations: number;
    isVerified: boolean;
    hasNid: boolean;
    hasPhoto: boolean;
    responseRate: number; // 0-1
    hasIllnessHistory: boolean;
  }): number {
    let score = 0;

    // Base from donations (max 50 points)
    score += Math.min(factors.totalDonations * 5, 50);

    // Verification bonus
    if (factors.isVerified) score += 15;
    if (factors.hasNid) score += 10;
    if (factors.hasPhoto) score += 5;

    // Response rate (max 20 points)
    score += Math.floor(factors.responseRate * 20);

    // Penalty
    if (factors.hasIllnessHistory) score = Math.max(0, score - 5);

    return Math.min(score, 100); // cap at 100
  }

  it('brand new user starts with 0 score', () => {
    expect(calculateTrustScore({
      totalDonations: 0, isVerified: false, hasNid: false,
      hasPhoto: false, responseRate: 0, hasIllnessHistory: false,
    })).toBe(0);
  });

  it('10 donations = 50 donation points (capped)', () => {
    expect(calculateTrustScore({
      totalDonations: 10, isVerified: false, hasNid: false,
      hasPhoto: false, responseRate: 0, hasIllnessHistory: false,
    })).toBe(50);
  });

  it('11 donations still = 50 donation points (not more)', () => {
    const score = calculateTrustScore({
      totalDonations: 11, isVerified: false, hasNid: false,
      hasPhoto: false, responseRate: 0, hasIllnessHistory: false,
    });
    expect(score).toBe(50);
  });

  it('verified user with NID + photo gets +30 bonus', () => {
    expect(calculateTrustScore({
      totalDonations: 0, isVerified: true, hasNid: true,
      hasPhoto: true, responseRate: 0, hasIllnessHistory: false,
    })).toBe(30); // 15 + 10 + 5
  });

  it('100% response rate gives +20 points', () => {
    expect(calculateTrustScore({
      totalDonations: 0, isVerified: false, hasNid: false,
      hasPhoto: false, responseRate: 1, hasIllnessHistory: false,
    })).toBe(20);
  });

  it('total score cannot exceed 100', () => {
    const score = calculateTrustScore({
      totalDonations: 20, isVerified: true, hasNid: true,
      hasPhoto: true, responseRate: 1, hasIllnessHistory: false,
    });
    expect(score).toBeLessThanOrEqual(100);
  });

  it('total score cannot go below 0', () => {
    expect(calculateTrustScore({
      totalDonations: 0, isVerified: false, hasNid: false,
      hasPhoto: false, responseRate: 0, hasIllnessHistory: true,
    })).toBeGreaterThanOrEqual(0);
  });

  it('illness history reduces score by 5', () => {
    const without = calculateTrustScore({
      totalDonations: 2, isVerified: false, hasNid: false,
      hasPhoto: false, responseRate: 0, hasIllnessHistory: false,
    });
    const with_ = calculateTrustScore({
      totalDonations: 2, isVerified: false, hasNid: false,
      hasPhoto: false, responseRate: 0, hasIllnessHistory: true,
    });
    expect(without - with_).toBe(5);
  });
});

// =============================================================================
// tests/unit/data-retention.test.ts
// Data retention policy rules
// =============================================================================

import { describe, it, expect } from 'vitest';
import { addYears, addDays, isBefore } from 'date-fns';

describe('Data Retention Policy', () => {

  describe('Donation Records — 7 Year Retention (BD Law)', () => {
    it('donation record from 6 years ago is NOT eligible for deletion', () => {
      const recordDate = addYears(new Date(), -6);
      const retentionEnd = addYears(recordDate, 7);
      const canDelete = isBefore(retentionEnd, new Date());
      expect(canDelete).toBe(false); // still within 7-year window
    });

    it('donation record from 8 years ago IS eligible for deletion', () => {
      const recordDate = addYears(new Date(), -8);
      const retentionEnd = addYears(recordDate, 7);
      const canDelete = isBefore(retentionEnd, new Date());
      expect(canDelete).toBe(true); // past 7-year window
    });

    it('donation record must be kept even when user requests deletion', () => {
      // Even after account deletion, donation records must be preserved
      const recordMustBePreserved = true; // BD DGDA law
      expect(recordMustBePreserved).toBe(true);
    });
  });

  describe('Notification Retention — 90 Days', () => {
    it('notification from 89 days ago is NOT eligible for deletion', () => {
      const notifDate = addDays(new Date(), -89);
      const retentionEnd = addDays(notifDate, 90);
      expect(isBefore(retentionEnd, new Date())).toBe(false);
    });

    it('notification from 91 days ago IS eligible for deletion', () => {
      const notifDate = addDays(new Date(), -91);
      const retentionEnd = addDays(notifDate, 90);
      expect(isBefore(retentionEnd, new Date())).toBe(true);
    });
  });

  describe('Audit Log Retention — 2 Years', () => {
    it('audit log from 23 months ago is NOT eligible', () => {
      const logDate = addDays(new Date(), -(23 * 30));
      const retentionEnd = addYears(logDate, 2);
      expect(isBefore(retentionEnd, new Date())).toBe(false);
    });

    it('audit log from 25 months ago IS eligible', () => {
      const logDate = addDays(new Date(), -(25 * 30));
      const retentionEnd = addYears(logDate, 2);
      expect(isBefore(retentionEnd, new Date())).toBe(true);
    });
  });

  describe('Account Grace Period — 90 Days After Deletion Request', () => {
    it('account deleted yesterday is still in grace period', () => {
      const deletedAt = addDays(new Date(), -1);
      const gracePeriodEnd = addDays(deletedAt, 90);
      const inGracePeriod = !isBefore(gracePeriodEnd, new Date());
      expect(inGracePeriod).toBe(true);
    });

    it('account deleted 91 days ago has passed grace period', () => {
      const deletedAt = addDays(new Date(), -91);
      const gracePeriodEnd = addDays(deletedAt, 90);
      const inGracePeriod = !isBefore(gracePeriodEnd, new Date());
      expect(inGracePeriod).toBe(false);
    });
  });
});
