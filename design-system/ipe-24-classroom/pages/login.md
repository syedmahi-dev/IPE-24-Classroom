# IPE-24 Login Page Design System

**File:** `apps/web/src/app/(auth)/login/page.tsx`
**Last Updated:** April 14, 2026
**Stack:** Next.js 14 + TypeScript + Tailwind CSS v4 + shadcn/ui + React Hook Form + Zod

---

## Design Overview

The login page implements a modern, accessible authentication interface following **UI/UX Pro Max** best practices. It features:

- **Tabbed authentication** (Google OAuth + Admin credentials in dev mode)
- **Dark mode optimized** with glassmorphism and gradient effects
- **Accessibility first** with ARIA labels, semantic HTML, and keyboard navigation
- **Responsive design** for mobile and desktop
- **Form validation** with clear error messaging
- **Security-focused** UX with password reveal/hide toggle

---

## Color Palette (Dark Mode)

| Element | Hex | Usage |
|---------|-----|-------|
| Background | `#0F172A` (`slate-950`) | Main page background |
| Secondary BG | `#1E293B` (`slate-900`) | Card backgrounds |
| Border | `#1E293B` (`slate-800`) | Input borders, dividers |
| Text Primary | `#F8FAFC` (`slate-50`) | Headings, labels |
| Text Secondary | `#CBD5E1` (`slate-400`) | Subheadings, descriptions |
| CTA/Primary | `#4F46E5` → `#6366F1` | Buttons, focus states (indigo gradient) |
| Secondary CTA | `#FFFFFF` (`white`) | Google OAuth button |
| Error | `#F87171` (`red-400`) | Error messages |
| Warning | `#FBBF24` (`amber-300`) | Dev mode notices |

**Accessibility Promise:**
- All text on colored backgrounds meets 4.5:1 contrast ratio (WCAG AA)
- Focus states use 2px indigo ring (`focus:ring-2 focus:ring-indigo-500/50`)
- Input placeholders have reduced opacity for clarity

---

## Typography

| Element | Font | Size | Weight | Line Height |
|---------|------|------|--------|-------------|
| Page Title | Fira Sans | 2.25rem (36px) | Bold (700) | 1.25 |
| Subtitle | Fira Sans | 1rem (16px) | Medium (500) | 1.5 |
| Card Heading | Fira Sans | 1.25rem (20px) | Bold (700) | 1.5 |
| Body Text | Fira Sans | 0.875rem (14px) | Medium (500) | 1.5 |
| Labels | Fira Sans | 0.875rem (14px) | Medium (500) | 1.5 |
| Captions | Fira Sans | 0.75rem (12px) | Medium (500) | 1.5 |
| Form Input | Fira Sans | 1rem (16px) | Medium (500) | 1.5 |

**Font Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap');
```

**Mood:** Professional, elegant, modern, trustworthy
**Personality:** Educational institution + tech-forward

---

## Component Specifications

### 1. Logo Section

**Container:**
- Width: Fixed 80px (w-20)
- Height: Fixed 80px (h-20)
- Background: `linear-gradient(to bottom-right, #4F46E5, #312E81)` (indigo gradient)
- Border Radius: 24px (rounded-3xl)
- Shadow: `shadow-2xl`
- Glow Effect: Parent div with `blur-lg` opacity-50, scales on hover

**Text Inside:**
- Content: "IUT" (3 characters)
- Color: `#FFFFFF` (white)
- Font Size: 1.875rem
- Font Weight: 700 (bold)
- Letter Spacing: Normal

**Hover State:**
- Glow effect opacity increases from 50% to 75%
- Duration: 300ms ease-in-out

### 2. Header Typography

**H1 (Page Title):**
- Text: "IPE-24 Portal"
- Size: `text-4xl` (36px desktop, scales responsive)
- Weight: Bold (700)
- Color: `slate-50` (#F8FAFC)
- Letter Spacing: Tight
- Margin Bottom: 12px

**Subtitle:**
- Text: "Islamic University of Technology"
- Size: `text-base md:text-lg` (responsive 14-18px)
- Weight: Regular (400)
- Color: `slate-400` (#CBD5E1)
- Margin Top: 12px

**Container:**
- Text Alignment: Center
- Space Between Title & Subtitle: 12px (`space-y-3` = 12px)
- Margin Below Header: 40px (`mb-10`)

### 3. Tab Navigation (Dev Mode Only)

**Container:**
- Background: `bg-slate-950/50` with `backdrop-blur-sm`
- Border: `border-b border-slate-800/50`
- Padding: 1rem (16px)

**Tab Button:**
- Base State:
  - Background: `bg-slate-950/50`
  - Color: `text-slate-400`
  - Border Radius: 6px (`rounded-md`)
  - Padding: 8px horizontal (px-4), 8px vertical (py-2)
  - Font: Medium, small size
  - Cursor: Pointer
  - Transition: 200ms

- Active State:
  - Background: `gradient-to-r from-indigo-600 to-indigo-700`
  - Color: `text-white`
  - Shadow: `shadow-lg`

- Hover State (Inactive):
  - Color: `text-slate-300`

**Width Distribution:**
- Each tab: `flex-1` (equal width)
- Gap between tabs: `gap-2`

### 4. Card (Main Form Container)

**Container:**
- Background: `bg-slate-900/50 backdrop-blur-sm` (Semi-transparent with blur)
- Border: `border border-slate-800/50`
- Border Radius: 16px (`rounded-2xl`)
- Shadow: `shadow-2xl`
- Max Width: 448px (`max-w-md`)
- Responsive Padding: 24px (`p-6`)

**Interior Sections:**
- Content padding: 24px (p-6)
- Content space between elements: 24px (`space-y-6`)

### 5. Error/Alert Messages

**Container:**
- Background: `bg-[color]/10` (10% opacity for primary color)
- Border: `border border-[color]/30` (30% opacity)
- Border Radius: 12px (`rounded-xl`)
- Padding: 16px (p-4)
- Display: Flex with gap-3
- Backdrop: `backdrop-blur-sm`

**Error (Red):**
- Background: `bg-red-500/10`
- Border Color: `border-red-500/30`
- Text Color: `text-red-400`

**Warning/Amber (Dev Mode):**
- Background: `bg-amber-500/10`
- Border Color: `border-amber-500/30`
- Text Color: `text-amber-300` or `text-amber-400`

**Icon:**
- Size: 20px (w-5, h-5)
- Vertical Alignment: Top with margin-top (mt-0.5)
- Flex Shrink: true
- ARIA: Hidden (`aria-hidden="true"`)

**Text:**
- Font Size: Small (`text-sm`)
- Line Height: Relaxed (leading-relaxed)
- ARIA: Status alerts use `role="alert"` with `aria-live="polite"`

### 6. Button States

#### Google OAuth Button (White Button)

**Base State:**
- Width: 100% (w-full)
- Height: 48px (h-12)
- Background: `bg-white`
- Text Color: `text-slate-900`
- Font Weight: 600 (semibold)
- Border Radius: 8px (`rounded-lg`)
- Shadow: `shadow-lg`
- Display: Flex with gap-3, center align

**Hover State:**
- Background: `hover:bg-slate-100`
- Transition: All 200ms

**Active State:**
- Background: `active:bg-slate-200`

**Disabled State:**
- Opacity: 75% (`disabled:opacity-75`)
- Cursor: `disabled:cursor-not-allowed`

**Loading State:**
- Shows spinner (Loader2 icon with `animate-spin`)
- Text changes to "Connecting to Google..."
- Button disabled during loading

#### Admin Submit Button (Indigo Gradient)

**Base State:**
- Width: 100%
- Height: 44px (h-11)
- Background: `bg-gradient-to-r from-indigo-600 to-indigo-700`
- Text Color: `text-white`
- Font Weight: 600 (semibold)
- Border Radius: 8px (`rounded-lg`)
- Shadow: `shadow-lg`
- Display: Flex with gap-2, center align
- Margin Top: 24px (mt-6)

**Hover State:**
- Gradient: `hover:from-indigo-500 hover:to-indigo-600`
- Transition: All 200ms

**Active State:**
- Gradient: `active:from-indigo-700 active:to-indigo-800`

**Disabled State:**
- Opacity: 75%
- Cursor: not-allowed

**Loading State:**
- Shows spinner + "Verifying credentials..."

### 7. Form Fields (Admin Tab)

**Label:**
- Color: `text-slate-300`
- Font Weight: 500 (medium)
- Font Size: 14px (`text-sm`)
- Margin Bottom: 8px (`mb-2`)
- Display: Block

**Input Container:**
- Position: Relative (for icon positioning)
- Icon positioning:
  - Absolute left: 16px (`left-4`)
  - Top center: 14px (`top-3.5`)
  - Size: 20px (`h-5 w-5`)
  - Color: `text-slate-500`
  - Pointer Events: None for icons
  - ARIA: Hidden

**Input Field:**
- Width: 100%
- Height: 44px (h-11)
- Padding Left: 48px (`pl-12`) for icon space
- Padding Right: 16px (`pr-4`) or 48px (`pr-12`) if toggle button
- Background: `bg-slate-950/50`
- Border: `border border-slate-800`
- Text Color: `text-slate-100`
- Placeholder Color: `placeholder-slate-500`
- Border Radius: 8px (`rounded-lg`)
- Font Weight: 500 (medium)
- Font Size: 1rem (16px)

**Focus State:**
- Background: `focus:bg-slate-950`
- Border Color: `focus:border-indigo-500`
- Ring: `focus:ring-2 focus:ring-indigo-500/50`
- Transition: All 200ms

**Disabled State:**
- Opacity: 75%
- Cursor: not-allowed

**Password Toggle Button (in password field):**
- Position: Absolute right (right-4)
- Top center: 14px
- Text Color: `text-slate-500`
- Hover Color: `hover:text-slate-300`
- Padding: 4px (p-1)
- Transition: 200ms
- Cursor: Pointer
- No background or border (icon only)

**Error Message:**
- Color: `text-red-400`
- Font Size: 14px (`text-sm`)
- Margin Top: 8px (`mt-2`)
- ARIA: Described by error ID

**Spacing Between Fields:**
- Vertical gap: 20px (`space-y-5`)

### 8. Background & Decorative Elements

**Page Background:**
- Base: `bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950`
- Gradient direction: Top-left to bottom-right
- Purpose: Subtle depth and visual interest

**Floating Orbs:**
- Position 1 (Top): 
  - Top: 0
  - Left: 25% (`left-1/4`)
  - Size: 384px (w-96, h-96)
  - Color: `bg-indigo-500/10`
  - Blur: `blur-3xl`
  - Animation: `animate-pulse`

- Position 2 (Bottom):
  - Bottom: 0
  - Right: 25% (`right-1/4`)
  - Size: 384px
  - Color: `bg-cyan-500/10`
  - Blur: `blur-3xl`
  - Animation: `animate-pulse` with 1s delay

**Overlay:**
- Position: Absolute, full inset
- Background: `bg-gradient-to-br from-slate-900/40 via-transparent to-slate-900/40`
- Purpose: Reduce orb visibility without removing them
- Pointer Events: None

---

## Interaction & Motion

### Transitions

| Action | Duration | Easing | Properties |
|--------|----------|--------|------------|
| Button hover | 200ms | ease-out | background, transform, shadow |
| Focus ring | 200ms | ease-out | border, ring |
| Tab switch | 200ms | ease-out | background, color |
| Logo glow | 300ms | ease-out | opacity |
| Orbsto animations | ∞ | ease-in-out | opacity (animate-pulse) |
| Spinner | ∞ | linear | transform (animate-spin) |

### Loading States

- **Button Loading:**
  - Show spinner icon (Loader2)
  - Change text to loading message
  - Disable button (opacity 75%)
  - Disable all other interactive elements using `disabled={isLoading || otherLoading}`

- **Spinner Animation:**
  - Icon: Lucide React's `Loader2`
  - Class: `animate-spin`
  - Color: Inherit from button text color

### Focus States

- **Keyboard Navigation:**
  - All interactive elements have visible focus rings
  - Ring: 2px, color `indigo-500/50`
  - Tab order: Respects visual hierarchy

- **Touch Targets (Mobile):**
  - Minimum 44×44 pixels for all buttons/inputs
  - Buttons are h-12 (48px) minimum
  - Input fields are h-11 (44px) minimum

### Password Toggle

- **Icon:** Eye icon (`Eye`) for hidden, EyeOff for visible
- **Action:** `onClick={() => setShowPassword(!showPassword)}`
- **Type Attribute:** Changes between "password" and "text"
- **Aria Label:** Updates to "Show password" or "Hide password"

---

## Accessibility Requirements

### WCAG 2.1 AA Compliance

| Requirement | Implementation |
|-------------|-----------------|
| **Color Contrast** | All text meets 4.5:1 ratio; tested with AAA* |
| **Focus Visible** | All interactive elements have 2px focus ring |
| **Keyboard Nav** | Tab order follows DOM, escape closes modals |
| **Form Labels** | All inputs have associated `<label>` elements |
| **Alt Text** | Decorative images have `aria-hidden="true"` |
| **ARIA Attributes** | `aria-label`, `aria-describedby`, `aria-busy`, `role="alert"` |
| **Error Messages** | Associated with input via `aria-describedby` |
| **Semantic HTML** | Uses `<button>`, `<form>`, `<label>`, not div buttons |
| **Touch Size** | All targets minimum 44×44px |
| **Reduced Motion** | Respects `prefers-reduced-motion` via custom CSS |

### ARIA Labels & Descriptions

- **Tab Buttons:** `aria-selected="true/false"`
- **Loading Buttons:** `aria-busy="true/false"`
- **Error Alerts:** `role="alert"` with `aria-live="polite"`
- **Icon Buttons:** `aria-label="Show password"`
- **Input Fields:** `aria-label="Email address"`, `aria-describedby="email-error"`
- **Decorative Icons:** `aria-hidden="true"`

---

## Responsive Design

### Breakpoints

| Device | Width | Adjustments |
|--------|-------|-------------|
| Mobile | 320–640px | Single column, full-width buttons, larger touch targets |
| Tablet | 640–1024px | Text scales to `text-base md:text-lg` |
| Desktop | 1024px+ | Full design with decorative elements |

### Responsive Classes

```tailwind
/* Typography */
h1 text-4xl              /* 36px on all sizes */
p text-base md:text-lg   /* 14px → 18px at md breakpoint */

/* Padding */
p-4                      /* 16px on mobile/tablet/desktop */

/* Layout */
max-w-md                 /* 448px max width */
```

---

## Form Validation

### Schema (Zod)

```typescript
export const credentialsSchema = z.object({
  email: z.string().email({ message: 'Valid email is required.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  totp: z.string().optional(),
})
```

### Validation UX

- **Real-time Display:** Errors shown below field on submit
- **Error Color:** `text-red-400`
- **Error Message:** Font size `text-sm`, margin top `mt-2`
-**Field State:** Input border stays `border-slate-800` even with errors
- **Clear & Context:** Error text is specific, not generic

---

## Component Interactions

### Tab Switching (Dev Mode)

```typescript
const [activeTab, setActiveTab] = useState('google')

// Tab button
<button onClick={() => setActiveTab('google')} />

// Content visibility
{(process.env.NODE_ENV !== 'development' || activeTab === 'google') && (
  <div>Google OAuth Section</div>
)}
```

### Password Visibility Toggle

```typescript
const [showPassword, setShowPassword] = useState(false)

<input type={showPassword ? 'text' : 'password'} />
<button onClick={() => setShowPassword(!showPassword)} />
```

### Loading State Coordination

```typescript
// Disable all buttons during any async operation
disabled={isGoogleLoading || isAdminLoading}
```

---

## Anti-Patterns to Avoid

- ❌ Removing placeholder text on focus (causes usability issues)
- ❌ Using color alone to indicate errors (add icon/text)
- ❌ Hover effects that don't work on touch devices
- ❌ Generic error messages ("Error occurred")
- ❌ Missing focus rings on form fields
- ❌ Buttons smaller than 44×44px
- ❌ Removing visual feedback during loading
- ❌ Password fields without visibility toggle
- ❌ Icons without `aria-hidden="true"` or `aria-label`

---

## Testing Checklist

- [ ] All form fields have visible labels
- [ ] All buttons are keyboard accessible (Tab key)
- [ ] Focus ring is visible on all interactive elements
- [ ] Error messages appear below relevant fields
- [ ] Loading states disable all buttons except the active one
- [ ] Password toggle shows/hides password correctly
- [ ] Tab switching works smoothly (dev mode)
- [ ] Page width doesn't exceed viewport on mobile
- [ ] Touch targets are minimum 44×44px
- [ ] Color contrast ratio is ≥4.5:1
- [ ] Page loads without JavaScript errors
- [ ] Form submission works both with Enter key and button click

---

## Implementation Notes

- **React Hook Form:** Used for form state management and validation
- **Zod:** Schema validation with type inference
- **Sonner:** Toast notifications for user feedback
- **TypeScript:** Full type safety throughout
- **Suspense:** Graceful fallback while content loads
- **Environment Checks:** Dev credentials only available in development mode

---

## References

- [UI/UX Pro Max](../../MASTER.md)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Next.js Authentication](../../../docs/07_AUTH.md)
- [Next.js Login Implementation](../../../docs/14_AUTH_FRONTEND.md)
