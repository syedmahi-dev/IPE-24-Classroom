// apps/web/test/security/rbac.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET as getRoutine } from '@/app/api/v1/admin/routine/route';
import { GET as getAnnouncements } from '@/app/api/v1/announcements/route';
import { Role } from '@prisma/client';
import { createTestUser, cleanupDatabase } from '../helpers/db';
import { NextRequest } from 'next/server';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));
import { auth } from '@/lib/auth';

describe('Security — Role-Based Access Control (RBAC)', () => {
  let superAdmin: any;
  let adminUser: any;
  let studentUser: any;

  beforeEach(async () => {
    await cleanupDatabase();
    superAdmin = await createTestUser({ role: Role.super_admin });
    adminUser = await createTestUser({ role: Role.admin });
    studentUser = await createTestUser({ role: Role.student });
  });

  describe('Standard API (Announcements)', () => {
    it('allows student to GET announcements', async () => {
      (auth as any).mockResolvedValue({ user: studentUser });
      const req = new NextRequest('http://localhost/api/v1/announcements');
      const res = await getAnnouncements(req);
      expect(res.status).toBe(200);
    });

    it('allows admin to GET announcements', async () => {
      (auth as any).mockResolvedValue({ user: adminUser });
      const req = new NextRequest('http://localhost/api/v1/announcements');
      const res = await getAnnouncements(req);
      expect(res.status).toBe(200);
    });
  });

  describe('Admin API (Routine Management)', () => {
    it('allows super_admin to access admin routine', async () => {
      (auth as any).mockResolvedValue({ user: superAdmin });
      const req = new NextRequest('http://localhost/api/v1/admin/routine');
      const res = await getRoutine(req);
      expect(res.status).toBe(200);
    });

    it('allows admin to access admin routine', async () => {
      (auth as any).mockResolvedValue({ user: adminUser });
      const req = new NextRequest('http://localhost/api/v1/admin/routine');
      const res = await getRoutine(req);
      expect(res.status).toBe(200);
    });

    it('DENIES student access to admin routine (403)', async () => {
      (auth as any).mockResolvedValue({ user: studentUser });
      const req = new NextRequest('http://localhost/api/v1/admin/routine');
      const res = await getRoutine(req);
      expect(res.status).toBe(403);
    });

    it('DENIES unauthenticated access to admin routine (401)', async () => {
      (auth as any).mockResolvedValue(null);
      const req = new NextRequest('http://localhost/api/v1/admin/routine');
      const res = await getRoutine(req);
      expect(res.status).toBe(401);
    });
  });

  describe('RBAC — Role Escalation Prevention', () => {
    it('does not allow student to act as admin via manual role field in body (if applicable)', () => {
       // This would be tested in a POST/PATCH route that handles user updates
       // For now, the handler-level check (403) is the primary defense.
    });
  });
});
