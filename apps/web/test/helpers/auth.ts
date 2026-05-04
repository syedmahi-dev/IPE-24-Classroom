// apps/web/test/helpers/auth.ts
import { vi } from 'vitest';
import { Role } from '@prisma/client';

/**
 * Mock NextAuth session
 */
export function mockSession(user: { id: string; email: string; name: string; role: Role }) {
  vi.mock('@/lib/auth', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/auth')>();
    return {
      ...actual,
      auth: vi.fn().mockResolvedValue({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        expires: new Date(Date.now() + 3600 * 1000).toISOString(),
      }),
    };
  });
}

export function clearSessionMock() {
  vi.resetModules();
}

/**
 * Mock API guard to bypass auth in integration tests if needed
 * or to simulate specific roles.
 * Note: The project uses direct auth() calls, not a centralized apiGuard.
 * This helper is kept for potential future use.
 */
export function mockApiGuard(user: { id: string; role: Role }) {
  mockSession({ id: user.id, email: 'test@iut-dhaka.edu', name: 'Test User', role: user.role });
}
