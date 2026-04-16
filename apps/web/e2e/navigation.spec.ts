import { test, expect } from '@playwright/test'

test.describe('Student Pages - Unauthenticated Redirects', () => {
  const studentPages = [
    '/dashboard',
    '/announcements',
    '/routine',
    '/exams',
    '/resources',
    '/polls',
    '/study-groups',
    '/chat',
    '/profile',
    '/settings',
    '/notifications',
  ]

  for (const path of studentPages) {
    test(`${path} redirects to /login`, async ({ page }) => {
      await page.goto(path)
      await page.waitForURL(/\/login/, { timeout: 10_000 })
      expect(page.url()).toContain('/login')
    })
  }
})

test.describe('Admin Pages - Unauthenticated Redirects', () => {
  const adminPages = [
    '/admin',
    '/admin/announcements',
    '/admin/exams',
    '/admin/files',
    '/admin/polls',
    '/admin/courses',
    '/admin/routine',
    '/admin/knowledge',
    '/admin/audit',
    '/admin/users',
    '/admin/settings',
    '/admin/drives',
    '/admin/telegram',
  ]

  for (const path of adminPages) {
    test(`${path} redirects to /login`, async ({ page }) => {
      await page.goto(path)
      await page.waitForURL(/\/login/, { timeout: 10_000 })
      expect(page.url()).toContain('/login')
    })
  }
})
