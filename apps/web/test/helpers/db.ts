// apps/web/test/helpers/db.ts
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

/**
 * SAFETY GUARD: Prevent test helpers from running against production database.
 * Tests must use TEST_DATABASE_URL, not the main DATABASE_URL.
 */
function assertTestDatabase() {
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.includes('supabase.com') || dbUrl.includes('pooler.supabase.com')) {
    throw new Error(
      '🚨 SAFETY: Test helpers detected a production database URL (Supabase). ' +
      'Set TEST_DATABASE_URL to a local/test database before running tests. ' +
      'Refusing to proceed to prevent data loss.'
    );
  }
}

export async function createTestUser(overrides: Partial<{
  email: string;
  name: string;
  role: Role;
  studentId: string;
}> = {}) {
  const id = `test-user-${Math.random().toString(36).substring(7)}`;
  return await prisma.user.create({
    data: {
      email: `${id}@example.com`,
      name: `Test User ${id}`,
      role: Role.student,
      ...overrides,
    },
  });
}

export async function createTestCourse(overrides: Partial<{
  code: string;
  name: string;
  semester: number;
}> = {}) {
  const id = Math.random().toString(36).substring(7);
  return await prisma.course.create({
    data: {
      code: overrides.code || `CSE-${id}`,
      name: overrides.name || `Test Course ${id}`,
      semester: overrides.semester || 1,
      creditHours: 3.0,
    },
  });
}

export async function createTestAnnouncement(authorId: string, overrides: Partial<{
  title: string;
  body: string;
  isPublished: boolean;
}> = {}) {
  return await prisma.announcement.create({
    data: {
      title: overrides.title || 'Test Announcement',
      body: overrides.body || 'This is a test announcement body.',
      authorId,
      isPublished: overrides.isPublished ?? true,
      publishedAt: overrides.isPublished ? new Date() : null,
    },
  });
}

export async function cleanupDatabase() {
  assertTestDatabase();
  
  const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `;

  for (const { tablename } of tablenames) {
    if (tablename !== '_prisma_migrations') {
      try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`);
      } catch (error) {
        console.warn(`Could not truncate table ${tablename}:`, error);
      }
    }
  }
}
