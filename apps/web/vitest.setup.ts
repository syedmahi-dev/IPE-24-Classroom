import '@testing-library/jest-dom/vitest'
import { vi, beforeAll, afterAll, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'

// Use test database
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

beforeAll(async () => {
  // Wipe tables before test run if possible
  try {
    if (process.env.TEST_DATABASE_URL) {
      await prisma.$executeRaw`
        TRUNCATE TABLE users, announcements, announcement_courses,
          file_uploads, exams, polls, poll_votes, knowledge_documents,
          knowledge_chunks, chat_logs, study_groups, study_group_members,
          notifications, push_tokens, audit_logs, sessions, accounts CASCADE
      `
    }
  } catch (e) {
    console.warn('Database truncation skipped or failed. This is expected if Docker/Postgres is not running.')
  }
})

afterAll(async () => {
  await prisma.$disconnect()
})

// Helper for database truncation (used in individual integration tests)
export const truncateDB = async (prismaInstance: any) => {
  try {
    const tablenames = await prismaInstance.$queryRaw<
      Array<{ tablename: string }>
    >`SELECT tablename FROM pg_tables WHERE schemaname='public'`

    const tables = tablenames
      .map(({ tablename }: { tablename: string }) => tablename)
      .filter((name: string) => name !== '_prisma_migrations')
      .map((name: string) => `"public"."${name}"`)
      .join(', ')

    await prismaInstance.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`)
  } catch (error) {
    // Silently fail if DB is not available
  }
}
