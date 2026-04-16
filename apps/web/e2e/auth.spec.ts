import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test('loads successfully and shows branding', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/IPE-24 Classroom/)
    await expect(page.getByText('IPE-24', { exact: true }).first()).toBeVisible()
  })

  test('has navigation links', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: /login|sign in|get started/i }).first()).toBeVisible()
  })

  test('is publicly accessible (no auth redirect)', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
    expect(page.url()).not.toContain('/login')
  })
})

test.describe('Login Page', () => {
  test('loads login page', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveTitle(/Login/)
  })

  test('shows Google sign-in option', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('button', { name: /sign in with google/i })).toBeVisible()
  })

  test('shows admin/credentials login tab', async ({ page }) => {
    await page.goto('/login')
    // The login page has tabs for Google and Admin login
    const adminTab = page.getByText(/admin|credentials|cr/i)
    await expect(adminTab.first()).toBeVisible()
  })

  test('credentials form validates email', async ({ page }) => {
    await page.goto('/login')
    // Switch to admin/credentials tab
    const adminTab = page.getByText(/admin|cr login|credentials/i)
    if (await adminTab.first().isVisible()) {
      await adminTab.first().click()
    }

    // Try submitting empty form
    const submitBtn = page.getByRole('button', { name: /sign in|log in|submit/i })
    if (await submitBtn.first().isVisible()) {
      await submitBtn.first().click()
      // Should show validation errors
      await expect(page.getByText(/email|required/i).first()).toBeVisible()
    }
  })
})

test.describe('Auth Redirects', () => {
  test('redirects unauthenticated user from /dashboard to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL(/\/login/)
    expect(page.url()).toContain('/login')
  })

  test('redirects unauthenticated user from /announcements to /login', async ({ page }) => {
    await page.goto('/announcements')
    await page.waitForURL(/\/login/)
    expect(page.url()).toContain('/login')
  })

  test('redirects unauthenticated user from /admin to /login', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForURL(/\/login/)
    expect(page.url()).toContain('/login')
  })

  test('redirects unauthenticated user from /profile to /login', async ({ page }) => {
    await page.goto('/profile')
    await page.waitForURL(/\/login/)
    expect(page.url()).toContain('/login')
  })

  test('redirects unauthenticated user from /routine to /login', async ({ page }) => {
    await page.goto('/routine')
    await page.waitForURL(/\/login/)
    expect(page.url()).toContain('/login')
  })
})

test.describe('Auth Error Page', () => {
  test('loads auth error page', async ({ page }) => {
    await page.goto('/auth/error')
    const response = await page.goto('/auth/error')
    expect(response?.status()).toBe(200)
  })

  test('shows error message for invalid callback', async ({ page }) => {
    await page.goto('/auth/error?error=AccessDenied')
    await expect(page.getByText(/error|denied|access/i).first()).toBeVisible()
  })
})
