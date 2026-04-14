# Auth UI Implementation

## 1. Login Page (`apps/web/app/(auth)/login/page.tsx`)
*Agent Instruction: Use `shadcn/ui` Card, Tabs, Input, Label, and Button components to build this UI.*

The login page must feature a tabbed interface separating standard student login (Google) from administrative access (Credentials).

**UI Requirements:**
* **Tab 1: Student Access**
    * Contains a single button: "Sign in with Google".
    * Triggers `signIn('google', { callbackUrl: '/dashboard' })`.
    * Include a helper text clarifying that only `@iut-dhaka.edu` accounts are allowed.
* **Tab 2: Admin Access**
    * A form utilizing `react-hook-form` and `zod` for validation.
    * Fields: `email`, `password`, and `totp` (2FA Code).
    * Submits via `signIn('credentials', { email, password, totp, redirect: false })`.
    * Handle errors (e.g., "INVALID_2FA") using `toast.error` from Sonner. On success, redirect to `/admin`.

## 2. Auth Error Page (`apps/web/app/(auth)/auth/error/page.tsx`)
*Agent Instruction: Build a page that reads the URL search parameters to display friendly error messages.*

**Logic:**
* Parse `searchParams.get('reason')`.
* If `reason === 'domain'`: Display "Please use your official @iut-dhaka.edu university email."
* If `reason === 'not-whitelisted'`: Display "Your email is not on the IPE-24 class roster. Contact the CR."
* Provide a "Back to Login" button.