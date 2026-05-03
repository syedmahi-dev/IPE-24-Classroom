// apps/web/test/integration/announcements.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, POST } from '@/app/api/v1/announcements/route';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { createTestUser, createTestAnnouncement, cleanupDatabase } from '../helpers/db';
import { NextRequest } from 'next/server';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));
import { auth } from '@/lib/auth';

describe('Announcements API — Integration', () => {
  let adminUser: any;
  let studentUser: any;

  beforeEach(async () => {
    await cleanupDatabase();
    adminUser = await createTestUser({ role: Role.admin });
    studentUser = await createTestUser({ role: Role.student });
  });

  describe('GET /api/v1/announcements', () => {
    it('returns 200 and list of announcements for student', async () => {
      await createTestAnnouncement(adminUser.id, { title: 'Exam Tomorrow', isPublished: true });
      await createTestAnnouncement(adminUser.id, { title: 'File Updated', isPublished: true });

      (auth as any).mockResolvedValue({ user: studentUser });

      const req = new NextRequest('http://localhost/api/v1/announcements');
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(2);
      // Descending order: newest first
      expect(json.data[0].title).toBe('File Updated');
      expect(json.data[1].title).toBe('Exam Tomorrow');
    });

    it('returns 401 when unauthenticated', async () => {
      (auth as any).mockResolvedValue(null);

      const req = new NextRequest('http://localhost/api/v1/announcements');
      const res = await GET(req);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/announcements', () => {
    it('creates announcement successfully as admin', async () => {
      (auth as any).mockResolvedValue({ user: adminUser });

      const body = {
        title: 'New Announcement',
        body: 'Testing integration creation',
        type: 'general',
      };

      const req = new NextRequest('http://localhost/api/v1/announcements', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      // Verify in DB
      const dbEntry = await prisma.announcement.findUnique({
        where: { id: json.data.id },
      });
      expect(dbEntry?.title).toBe('New Announcement');
      expect(dbEntry?.authorId).toBe(adminUser.id);
    });

    it('returns 403 when student tries to create announcement', async () => {
      (auth as any).mockResolvedValue({ user: studentUser });

      const body = { title: 'Hacked', body: 'Should not work', type: 'general' };
      const req = new NextRequest('http://localhost/api/v1/announcements', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      const res = await POST(req);
      expect(res.status).toBe(403);

      // Verify NOT in DB
      const count = await prisma.announcement.count();
      expect(count).toBe(0);
    });

    it('validates required fields via Zod', async () => {
      (auth as any).mockResolvedValue({ user: adminUser });

      const body = { title: '', body: '' }; // Invalid
      const req = new NextRequest('http://localhost/api/v1/announcements', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });
});
