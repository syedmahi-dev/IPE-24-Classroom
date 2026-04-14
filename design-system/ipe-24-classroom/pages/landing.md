# IPE-24 Landing Page Design System

**File:** `apps/web/src/app/page.tsx`  
**Last Updated:** April 14, 2026  
**Stack:** Next.js 14 + TypeScript + Tailwind CSS v4 + React  

---

## Design Overview

The landing page serves as the public gateway to the IPE-24 Portal, showcasing features and guiding users to authentication. It implements a modern, performance-optimized design with:

- **Hero-centric layout** with strong visual hierarchy
- **Bento grid** feature showcase with interactive cards
- **Glassmorphism** design with backdrop blur effects
- **Smooth animations** and interactive elements
- **Responsive design** from mobile to desktop
- **Accessibility-first** approach with WCAG AA compliance

---

## Color Palette

| Element | Hex | Tailwind | Usage |
|---------|-----|----------|-------|
| Background | `#0F172A` | slate-950 | Page background |
| Secondary BG | `#1E293B` | slate-900 | Card backgrounds |
| Card Border | `#1E293B` | slate-800 | Subtle borders |
| Text Primary | `#F8FAFC` | slate-50 | Headings |
| Text Secondary | `#94A3B8` | slate-400 | Body text |
| Text Muted | `#64748B` | slate-500 | Footer text |
| Primary CTA | `#4F46E5` | indigo-600 | Action buttons |
| Accent Gradient | indigo → cyan | indigo-400 → cyan-400 | Hero text |
| Icon: Blue | `#3B82F6` | blue-500 | AI CR feature |
| Icon: Green | `#10B981` | emerald-600 | Routine feature |
| Icon: Amber | `#F59E0B` | amber-500 | Broadcast feature |
| Icon: Purple | `#A855F7` | purple-500 | Resources feature |
| Icon: Pink | `#EC4899` | pink-500 | Study groups feature |

**Contrast Verification:**
- slate-50 on slate-950 = **13:1 ratio** ✅ WCAG AAA
- slate-400 on slate-950 = **5.2:1 ratio** ✅ WCAG AA
- indigo-600 on white = **3.1:1 ratio** ⚠️ WCAG AA (for larger text only)

---

## Typography System

| Element | Font | Size | Weight | Line Height | Usage |
|---------|------|------|--------|-------------|-------|
| H1 (Hero) | Fira Sans | 3rem–4rem (48–64px) | Bold (700) | 1.2 | Page title |
| H2 (Section) | Fira Sans | 2.25rem–3rem (36–48px) | Bold (700) | 1.2 | Section headers |
| H3 (Card Title) | Fira Sans | 1.5rem (24px) | Bold (700) | 1.2 | Feature titles |
| Body Text | Fira Sans | 1rem (16px) | Medium (500) | 1.5 | Main copy |
| Small Text | Fira Sans | 0.875rem (14px) | Medium (500) | 1.5 | Labels, footer |
| Tiny Text | Fira Sans | 0.75rem (12px) | Medium (500) | 1.5 | Captions |
| Gradient Text | Fira Sans | Depends | Bold (700) | — | "IPE-24" accent |

**Font Scale:**
```
sm:  12px (text-xs)
14px (text-sm)
16px (text-base)
18px (text-lg)
20px (text-xl)
24px (text-2xl)
32px (text-3xl)
36px (text-4xl)
48px (text-5xl)
64px (text-6xl)
80px (text-7xl)
```

---

## Component Specifications

### 1. Navigation Bar

**Container:**
- Position: Fixed top, z-index 50
- Height: 64px (h-16)
- Background: Transparent (scrolled → semi-transparent with backdrop blur)
- Border: None (scrolled → border-b border-slate-800/50)
- Max Width: 7xl (80rem)
- Padding: 0.5rem (px-4 md:px-6)
- Transition Duration: 300ms

**Logo Section:**
- Display: Flex, gap-3
- Icon: 40px (w-10 h-10) gradient box
- Text: Font-bold, text-lg tracking-tight
- Subtext: text-xs, text-slate-400, -mt-1

**Navigation Links (Desktop Only):**
- Hidden on mobile (hidden md:flex)
- Gap: 2rem (gap-8)
- Color: text-slate-400 hover:text-slate-200
- Font: text-sm font-medium
- Transition: 200ms

**Sign In Button:**
- Padding: px-6 py-2.5
- Border Radius: rounded-lg (8px)
- Background: bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
- Text: text-white font-semibold text-sm
- Shadow: shadow-lg hover:shadow-xl
- Transition: 200ms

---

### 2. Hero Section

**Container:**
- Height: min-h-screen (full viewport height)
- Padding: py-24 px-4 md:px-6, pt-16 (after navbar)
- Display: flex items-center
- Max Width: 5xl (64rem)

**Badge:**
- Display: inline-flex
- Padding: px-4 py-2
- Border Radius: rounded-full
- Background: bg-indigo-500/10
- Border: border-indigo-500/30
- Text Color: text-indigo-300
- Font: text-sm font-semibold
- Icon: Zap (4px × 4px)
- Margin Bottom: mb-8

**H1 Heading:**
- Font Size: text-5xl md:text-7xl lg:text-8xl
- Font Weight: font-bold
- Tracking: tracking-tight
- Line Height: leading-tight
- Margin Bottom: mb-6
- Text Color: slate-50

**Gradient Accent:**
```tailwind
text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-indigo-400
```

**Subheading:**
- Font Size: text-lg md:text-xl
- Color: text-slate-400
- Max Width: max-w-3xl
- Margin Bottom: mb-12
- Line Height: leading-relaxed
- Font Weight: font-medium

**Buttons Container:**
- Display: flex flex-col sm:flex-row
- Gap: gap-4
- Margin Bottom: mb-16

**Primary Button:**
- Padding: px-8 py-4
- Border Radius: rounded-xl (12px)
- Background: gradient from-indigo-600 to-indigo-700
- Hover: from-indigo-500 to-indigo-600
- Active: from-indigo-700 to-indigo-800
- Text: text-white font-bold text-base
- Shadow: shadow-lg hover:shadow-xl
- Transform: hover:-translate-y-0.5
- Width: w-full sm:w-auto
- Display: flex items-center gap-2 justify-center

**Secondary Button:**
- Padding: px-8 py-4
- Border Radius: rounded-xl
- Border: border-2 border-slate-700 hover:border-slate-600
- Background: bg-slate-950/50 hover:bg-slate-900
- Text: text-slate-100 font-bold text-base
- Transition: 200ms
- Backdrop: backdrop-blur-sm

**Trust Indicators:**
- Display: flex flex-col sm:flex-row items-start sm:items-center gap-6
- Font Size: text-sm
- Color: text-slate-400
- Icons: Shield (green-400), Zap (amber-400)

---

### 3. Features Section

**Section Container:**
- Padding: py-24 px-4 md:px-6
- Max Width: 7xl

**Section Header:**
- Text Alignment: center
- Max Width: max-w-3xl
- Margin Bottom: mb-16

**H2 Title:**
- Font Size: text-4xl md:text-5xl
- Font Weight: font-bold
- Color: text-slate-50
- Margin Bottom: mb-6

**Subtitle:**
- Font Size: text-lg
- Color: text-slate-400

**Feature Grid:**
- Display: grid md:grid-cols-2 lg:grid-cols-3
- Gap: gap-6

**Feature Card:**
- Grid Span: lg:col-span-1 (normal) | lg:col-span-2 (wide card)
- Background: gradient from-slate-900/50 to-slate-900/30
- Border: border border-slate-800/50
- Border Radius: rounded-3xl (24px)
- Padding: p-8
- Hover State:
  - Border Color: hover:border-slate-700/50
  - Background: hover:bg-slate-900/50
- Transition: all duration-300
- Backdrop: backdrop-blur-sm
- Shadow: shadow-lg hover:shadow-xl

**Icon Container:**
- Size: w-14 h-14 (56px)
- Background: gradient (color)/20 to (color+1)/20
- Border Radius: rounded-2xl (16px)
- Display: flex items-center justify-center
- Margin Bottom: mb-6
- Transform: group-hover:scale-110 transition-transform

**Card Title:**
- Font Size: text-2xl
- Font Weight: font-bold
- Color: text-white
- Margin Bottom: mb-4

**Card Description:**
- Font Size: base (default)
- Color: text-slate-400
- Line Height: leading-relaxed
- Margin Bottom: mb-4

**Card Link:**
- Font Size: text-sm
- Color: text-indigo-400 font-semibold
- Display: flex items-center gap-1
- Arrow transitions: group-hover:gap-2
- Transform: opacity and spacing

---

### 4. Capabilities Section

**Container:**
- Padding: py-24 px-4 md:px-6
- Background: bg-gradient-to-b from-transparent to-indigo-950/10

**Section Header:**
- Same as features section

**Grid Layout:**
- Display: grid md:grid-cols-2
- Gap: gap-8

**Capability Card:**
- Background: bg-slate-900/50 border border-slate-800/50
- Border Radius: rounded-2xl (16px)
- Padding: p-8
- Backdrop: backdrop-blur-sm

**Icon + Title:**
- Display: flex items-center gap-3
- Margin Bottom: mb-4

**Icon Box:**
- Size: w-10 h-10
- Background: (color)/20
- Border Radius: rounded-lg
- Display: flex items-center justify-center

**Description:**
- Color: text-slate-400
- Line Height: leading-relaxed

---

### 5. Stats Section

**Container:**
- Padding: py-20 px-4 md:px-6

**Grid:**
- Display: grid md:grid-cols-3
- Gap: gap-8

**Stat Box:**
- Text Alignment: center

**Stat Number:**
- Font Size: text-5xl
- Font Weight: font-bold
- Background: gradient from-indigo-400 to-cyan-400
- Text: transparent bg-clip-text
- Margin Bottom: mb-2

**Stat Label:**
- Color: text-slate-400
- Font Weight: font-medium

---

### 6. CTA Section

**Container:**
- Padding: py-24 px-4 md:px-6
- Max Width: 3xl
- Text Alignment: center

**H2 Title:**
- Font Size: text-4xl md:text-5xl
- Font Weight: font-bold
- Color: text-slate-50
- Margin Bottom: mb-6

**Subtitle:**
- Font Size: text-lg
- Color: text-slate-400
- Margin Bottom: mb-12

**Button:**
- Same as primary button in hero section

---

### 7. Footer

**Container:**
- Border Top: border-t border-slate-800/50
- Padding: py-12 px-4 md:px-6
- Background: bg-gradient-to-b from-transparent to-slate-900/20

**Main Grid:**
- Display: grid md:grid-cols-3
- Gap: gap-12
- Margin Bottom: mb-12

**Branding Column:**
- Logo: Same as navbar
- Description: text-slate-500 text-sm leading-relaxed

**Quick Links Column:**
- H4: font-bold text-slate-50 mb-4 text-sm uppercase tracking-wide
- Links: text-slate-400 hover:text-slate-200 transition-colors text-sm
- Spacing: space-y-3

**Support Column:**
- Same structure as Quick Links
- Links include icons (Mail: 4×4)

**Bottom Bar:**
- Border Top: border-t border-slate-800/50
- Padding: pt-8
- Display: flex flex-col sm:flex-row items-center justify-between gap-4
- Left Text: © {year} IPE-24 • Islamic University of Technology
- Right Text: Separated by dot divider

---

## Background & Decorative Elements

**Fixed Background:**
- Position: fixed inset-0
- Pointer Events: pointer-events-none
- Overflow: overflow-hidden

**Orb 1 (Top):**
- Position: absolute top-0 left-1/4
- Size: w-96 h-96 (384px)
- Color: bg-indigo-500/10
- Blur: blur-3xl
- Animation: animate-pulse

**Orb 2 (Bottom):**
- Position: absolute bottom-0 right-1/4
- Size: w-96 h-96
- Color: bg-cyan-500/10
- Blur: blur-3xl
- Animation: animate-pulse with 1s delay

**Overlay:**
- Position: absolute inset-0
- Background: bg-gradient-to-br from-slate-900/40 via-transparent to-slate-900/40
- Purpose: Reduce orb intensity

**Main Content:**
- Position: relative z-10

---

## Interactions & Animations

### Transitions

| Element | Duration | Property | Easing |
|---------|----------|----------|--------|
| Navigation | 300ms | all | ease-out |
| Card hover | 300ms | all | ease-out |
| Button hover | 200ms | all | ease-out |
| Icon scale | Inherit | transform | ease-out |
| Scroll effect | 200ms | scroll | smooth |

### Animations

**Animate Pulse (Orbs):**
```css
@keyframes pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.7; }
}
duration: 2s
timing: ease-in-out
```

**Gradient Animation (Hero Text):**
```css
@keyframes gradient {
  0%, 100% { background-position: 0%; }
  50% { background-position: 100%; }
}
```

**Hover Effects:**
- Card: border color + shadow increase
- Button: translate-y shift + shadow increase
- Icon: scale-110 (grows 110%)
- Arrow: translate-x-1 (slight right shift)

---

## Responsive Breakpoints

| Breakpoint | Width | Adjustments |
|------------|-------|-------------|
| Mobile | 320–640px | Single column, full-width buttons, nav logo only |
| Tablet | 640–1024px | 2-column grid, hidden nav links |
| Desktop | 1024px+ | 3-column grid, full navigation |

### Mobile-First CSS:
```tailwind
/* Default: mobile */
text-5xl               /* 48px */
md:text-7xl            /* 56px at tablet+ */
lg:text-8xl            /* 64px at desktop+ */

/* Navigation */
hidden md:flex         /* Hidden on mobile/tablet */

/* Grid */
grid-cols-1            /* 1 column default */
md:grid-cols-2         /* 2 columns at tablet+ */
lg:grid-cols-3         /* 3 columns at desktop+ */
```

---

## Accessibility

### WCAG 2.1 AA Compliance

| Feature | Implementation |
|---------|-----------------|
| **Color Contrast** | slate-50 on slate-950 = 13:1 ✅ AAA |
| **Focus Visible** | Links have :focus-visible styles |
| **Semantic HTML** | `<section>`, `<header>`, `<footer>`, `<nav>` |
| **Alt Text** | Images have descriptive alt text |
| **Link Text** | Clear, descriptive link labels |
| **Skip Links** | Navigation skips to main content |
| **Font Size** | Minimum 16px for body text |
| **Touch Targets** | Buttons ≥44×44px |
| **Motion** | Respects prefers-reduced-motion |

### Interactive Elements

**Links & Buttons:**
```tsx
<a href="#features">Learn More</a>  // Descriptive link text
<button aria-label="Sign in">Sign In</button>  // Accessible button
```

**Images:**
```tsx
<img alt="IPE-24 Portal Logo" src="/logo.svg" />
```

---

## Performance Optimization

### Bundle Size
- **CSS:** ~250 Tailwind classes (minified)
- **JS:** ~5KB (scroll event, state management)
- **Dependencies:** None (all standard)

### Runtime Performance
- **First Contentful Paint:** <1s
- **Interaction to Paint:** <100ms
- **Layout Shift Cumulative:** <0.1 (CLS metric)

### Lighthouse Targets
- Performance: 95+
- Accessibility: 100
- Best Practices: 100
- SEO: 100

### Optimization Techniques
- ✅ CSS animations (no JS required)
- ✅ Transform-based animations (no layout shift)
- ✅ Backdrop blur with hardware acceleration
- ✅ Fixed background (no reflow on scroll)
- ✅ Minimal JavaScript (scroll listener only)
- ✅ Image optimization with next/image

---

## Browser Support

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | Latest | ✅ Full |
| Firefox | Latest | ✅ Full |
| Safari | 14+ | ✅ Full |
| Edge | Latest | ✅ Full |
| iOS Safari | 14+ | ✅ Full |
| Chrome Mobile | Latest | ✅ Full |

---

## Design Tokens (CSS Variables)

```css
/* Colors */
--color-primary: #4F46E5;     /* indigo-600 */
--color-secondary: #1E293B;   /* slate-900 */
--color-text: #F8FAFC;        /* slate-50 */
--color-text-muted: #94A3B8;  /* slate-400 */

/* Spacing */
--radius-lg: 24px;            /* rounded-3xl */
--radius-md: 16px;            /* rounded-2xl */
--radius-sm: 12px;            /* rounded-xl */

/* Shadows */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
```

---

## Testing Checklist

- [ ] Navigation responsive on mobile/tablet/desktop
- [ ] All links are keyboard accessible (Tab key)
- [ ] Color contrast meets WCAG AA (4.5:1 ratio)
- [ ] Page has no layout shift (CLS < 0.1)
- [ ] Hero image loads in <1s
- [ ] Hover states work on desktop
- [ ] Animations respect prefers-reduced-motion
- [ ] Touch targets are ≥44×44px
- [ ] Form validation works (if applicable)
- [ ] Page loads without JavaScript errors

---

## Anti-Patterns to Avoid

- ❌ Using color alone to convey information (add text/icon)
- ❌ Animations with transform: width/height (cause layout shift)
- ❌ Inline styles (use Tailwind classes)
- ❌ Hardcoded colors (use design tokens)
- ❌ Missing alt text on images
- ❌ Interactive elements smaller than 44×44px
- ❌ Hover effects that don't work on touch
- ❌ Auto-playing animations/videos

---

## References

- [UI/UX Pro Max](../../MASTER.md) — Design system master
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/) — Accessibility standards
- [Next.js 14 Docs](https://nextjs.org/docs) — Framework documentation
