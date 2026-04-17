# Admin UI/UX Component Library - Quick Reference

**Status:** ✅ Production Ready  
**Last Updated:** April 17, 2026  
**Framework:** UI/UX Pro Max

---

## 📦 Component Inventory

### Core Components (Dark Theme - Purple Admin Accent)

```
components/admin/
├─ AdminPageHeader.tsx        ✅ Title + CTA (already existed, styled well)
├─ AdminStatsRow.tsx          ✅ REDESIGNED - Gradient stat cards
├─ AdminDataTable.tsx         ✅ REDESIGNED - Dark table with badges
├─ AdminFormField.tsx         ✅ REDESIGNED - Dark form inputs
├─ AdminButton.tsx            ✅ NEW - Button variants & icons
├─ StatusBadge.tsx            ✅ NEW - Status/Type/Role indicators
├─ AdminModal.tsx             (existing - use with new styling)
├─ ConfirmDialog.tsx          (existing - use with new styling)
├─ PendingActionsWidget.tsx   (existing - can be enhanced)
├─ SystemHealthWidget.tsx     (existing - can be enhanced)
└─ __tests__/                 (test files)
```

---

## 🎨 Color Reference

### Semantic Colors (Use Consistently)

```
SUCCESS     - Emerald #10B981    | For: Completed, Active, Approved
WARNING     - Amber   #F59E0B    | For: Pending, Draft, Attention
DANGER      - Red     #EF4444    | For: Failed, Error, Delete
INFO        - Blue    #3B82F6    | For: Information, General
ADMIN       - Purple  #A855F7    | For: Primary Actions, Admin-specific
```

### Background Gradients

```
Success:   from-emerald-500/20 to-emerald-600/10  border-emerald-500/20
Warning:   from-amber-500/20 to-amber-600/10      border-amber-500/20
Danger:    from-red-500/20 to-red-600/10          border-red-500/20
Info:      from-blue-500/20 to-blue-600/10        border-blue-500/20
Purple:    from-purple-500/20 to-purple-600/10    border-purple-500/20
```

---

## 🔧 Component Usage Guide

### 1️⃣ AdminButton - Actions & CTAs

```tsx
import { AdminButton, AdminIconButton } from '@/components/admin/AdminButton'
import { Plus, Trash, Edit, Download } from 'lucide-react'

// Primary action (with text)
<AdminButton 
  variant="primary" 
  icon={Plus} 
  size="lg"
  onClick={handleCreate}
>
  Create New
</AdminButton>

// Secondary action
<AdminButton 
  variant="secondary" 
  size="md"
>
  Cancel
</AdminButton>

// Danger action (with confirmation)
<AdminButton 
  variant="danger"
  icon={Trash}
  onClick={handleDelete}
>
  Delete Item
</AdminButton>

// Icon-only button (for compact spaces)
<AdminIconButton 
  variant="ghost" 
  icon={Edit}
  title="Edit this item"
/>

// Loading state
<AdminButton 
  loading
  variant="primary"
>
  Saving...
</AdminButton>

// Disabled state
<AdminButton 
  disabled
  variant="secondary"
>
  Approve (awaiting review)
</AdminButton>
```

**Variants:** primary | secondary | danger | success | warning | ghost  
**Sizes:** sm | md | lg  
**Props:** icon, loading, disabled, onClick, className

---

### 2️⃣ StatusBadge - Status Indicators

```tsx
import { StatusBadge } from '@/components/admin/StatusBadge'

// In table columns:
{
  key: 'status',
  label: 'Status',
  render: (item) => <StatusBadge status={item.status} />
}

// Standalone:
<StatusBadge status="active" />
<StatusBadge status="draft" />
<StatusBadge status="pending" />
<StatusBadge status="archived" />
<StatusBadge status="completed" />
<StatusBadge status="failed" />
<StatusBadge status="published" />
```

**Visual:** [● ICON] LABEL with gradient background + pulsing dot

---

### 3️⃣ TypeBadge - Content Type Indicators

```tsx
import { TypeBadge } from '@/components/admin/StatusBadge'

// In announcements table:
{
  key: 'type',
  label: 'Type',
  render: (item) => <TypeBadge type={item.type} />
}

// Standalone:
<TypeBadge type="exam" />          // 📝 EXAM
<TypeBadge type="file" />          // 📄 FILE
<TypeBadge type="general" />       // 📢 GENERAL
<TypeBadge type="routine" />       // ⏰ ROUTINE
<TypeBadge type="poll" />          // 🗳️ POLL
<TypeBadge type="announcement" />  // 📣 ANNOUNCEMENT
```

**Visual:** [EMOJI] LABEL with gradient background

---

### 4️⃣ RoleBadge - User Role Indicators

```tsx
import { RoleBadge } from '@/components/admin/StatusBadge'

// In user management table:
{
  key: 'role',
  label: 'Role',
  render: (user) => <RoleBadge role={user.role} />
}

// Standalone:
<RoleBadge role="student" />       // 👤 STUDENT (Slate)
<RoleBadge role="admin" />         // 👤 ADMIN (Purple)
<RoleBadge role="cr" />            // 👤 CLASS REP (Pink)
<RoleBadge role="super_admin" />   // 👤 SUPER ADMIN (Red)
```

---

### 5️⃣ AdminStatsRow - Overview Statistics

```tsx
import { AdminStatsRow } from '@/components/admin/AdminStatsRow'

const stats = {
  students: 256,
  announcements: 42,
  files: 184,
  polls: 12,
  admins: 3,
  // Optional trend data:
  studentsTrend: 5,           // +5% this month
  announcementsTrend: 12,     // +12% this month
  filesTrend: -2,             // -2% this month
}

<AdminStatsRow stats={stats} role="super_admin" />
```

**Shows 5 cards:**
- 👥 Students (Blue)
- 🛡️ Admins (Amber, CR-only)
- 📣 Announcements (Purple)
- 📦 Files (Emerald)
- 🗳️ Polls (Red)

**Features:**
- Icon in colored background
- Large number
- Subtitle text
- Optional trend up/down percentage
- Responsive: 1 col (mobile) → 2 cols (tablet) → 4-5 cols (desktop)

---

### 6️⃣ AdminDataTable - Listings with Filters

```tsx
import { AdminDataTable } from '@/components/admin/AdminDataTable'
import { StatusBadge, TypeBadge } from '@/components/admin/StatusBadge'
import { AdminIconButton } from '@/components/admin/AdminButton'
import { Edit, Trash } from 'lucide-react'

<AdminDataTable
  // Structure
  columns={[
    {
      key: 'title',
      label: 'Title',
      render: (item) => (
        <span className="font-bold text-slate-100">{item.title}</span>
      )
    },
    {
      key: 'type',
      label: 'Type',
      render: (item) => <TypeBadge type={item.type} />
    },
    {
      key: 'status',
      label: 'Status',
      render: (item) => <StatusBadge status={item.status} />
    },
    {
      key: 'author',
      label: 'Author',
      hideOnMobile: true
    },
    {
      key: 'date',
      label: 'Date',
      render: (item) => new Date(item.createdAt).toLocaleDateString(),
      hideOnMobile: true
    }
  ]}
  
  // Data & Pagination
  data={announcements}
  loading={isLoading}
  page={page}
  totalPages={Math.ceil(total / 20)}
  total={total}
  onPageChange={setPage}
  
  // Search & Filter
  search={search}
  onSearchChange={setSearch}
  searchPlaceholder="Search announcements..."
  filterBar={
    <select
      value={typeFilter}
      onChange={(e) => setTypeFilter(e.target.value)}
      className="px-3 py-2 bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-sm font-bold"
    >
      <option value="">All Types</option>
      <option value="exam">Exam</option>
      <option value="file">File</option>
      <option value="general">General</option>
    </select>
  }
  
  // Row Actions
  actions={(item) => (
    <div className="flex gap-1">
      <AdminIconButton
        variant="ghost"
        icon={Edit}
        size="sm"
        title="Edit"
        onClick={() => handleEdit(item)}
      />
      <AdminIconButton
        variant="danger"
        icon={Trash}
        size="sm"
        title="Delete"
        onClick={() => handleDelete(item)}
      />
    </div>
  )}
  
  onRowClick={(item) => navigate(`/admin/announcements/${item.id}`)}
  
  // Messages
  getId={(item) => item.id}
  emptyTitle="No announcements found"
  emptyMessage="Try adjusting your filters or create a new announcement."
/>
```

**Features:**
- Dark theme with gradient backgrounds
- Search functionality with purple focus ring
- Filter bar support
- Sortable columns
- Pagination with styled buttons
- Mobile-friendly card layout
- Hover effects with animations
- Customizable empty state

---

### 7️⃣ AdminFormField - Form Inputs (Dark Theme)

```tsx
import { AdminFormField } from '@/components/admin/AdminFormField'

// Text input
<AdminFormField
  type="text"
  label="Title"
  value={title}
  onChange={setTitle}
  placeholder="Enter title"
  required
  hint="Max 200 characters"
/>

// Email input
<AdminFormField
  type="email"
  label="Email"
  value={email}
  onChange={setEmail}
  required
  error={emailError}
/>

// Textarea
<AdminFormField
  type="textarea"
  label="Description"
  value={description}
  onChange={setDescription}
  placeholder="Enter full description"
  rows={6}
/>

// Select dropdown
<AdminFormField
  type="select"
  label="Content Type"
  value={type}
  onChange={setType}
  options={[
    { value: 'exam', label: 'Exam' },
    { value: 'file', label: 'File' },
    { value: 'general', label: 'General' },
  ]}
  required
/>

// DateTime picker
<AdminFormField
  type="datetime"
  label="Publish At"
  value={publishAt}
  onChange={setPublishAt}
/>

// File upload
<AdminFormField
  type="file"
  label="Upload PDF"
  onChange={(files) => setFile(files?.[0])}
  accept=".pdf,.doc,.docx"
/>

// Checkbox
<AdminFormField
  type="checkbox"
  label="Send notifications"
  checked={notifyStudents}
  onChange={setNotifyStudents}
/>
```

**Features:**
- Dark background (slate-950/40)
- Purple focus ring
- Error messages in red-400
- Hint text in slate-400
- Gradient file upload area
- Dark checkboxes

---

## 🏗️ Admin Page Template

```tsx
'use client'

import { useState } from 'react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminStatsRow } from '@/components/admin/AdminStatsRow'
import { AdminDataTable, type Column } from '@/components/admin/AdminDataTable'
import { AdminButton } from '@/components/admin/AdminButton'
import { StatusBadge, TypeBadge } from '@/components/admin/StatusBadge'
import { Megaphone, Plus, Edit, Trash } from 'lucide-react'

export default function AnnouncementsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  
  // Fetch data
  const [announcements, setAnnouncements] = useState([])
  const [stats] = useState({ announcements: 42, /* ... */ })
  const [isLoading, setIsLoading] = useState(false)
  
  const columns: Column<any>[] = [
    {
      key: 'title',
      label: 'Title',
      render: (item) => (
        <span className="font-bold text-slate-100">{item.title}</span>
      )
    },
    {
      key: 'type',
      label: 'Type',
      render: (item) => <TypeBadge type={item.type} />
    },
    {
      key: 'status',
      label: 'Status',
      render: (item) => <StatusBadge status={item.status} />
    },
    {
      key: 'date',
      label: 'Published',
      render: (item) => new Date(item.createdAt).toLocaleDateString(),
    }
  ]
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <AdminPageHeader
        icon={Megaphone}
        title="Announcements"
        subtitle="Create, edit, and manage class announcements"
        actionLabel="New Announcement"
        onAction={() => {/* handle create */}}
        actionIcon={Plus}
        badge={`${announcements.length} Total`}
      />
      
      {/* Stats */}
      <AdminStatsRow stats={stats} role="admin" />
      
      {/* Table */}
      <AdminDataTable
        columns={columns}
        data={announcements}
        loading={isLoading}
        page={page}
        totalPages={5}
        onPageChange={setPage}
        search={search}
        onSearchChange={setSearch}
        getId={(item) => item.id}
        actions={(item) => (
          <div className="flex gap-1">
            <AdminButton
              variant="ghost"
              icon={Edit}
              size="sm"
              onClick={() => {/* edit */}}
            />
            <AdminButton
              variant="danger"
              icon={Trash}
              size="sm"
              onClick={() => {/* delete */}}
            />
          </div>
        )}
      />
    </div>
  )
}
```

---

## 🎯 Implementation Checklist

When building admin pages:

- [ ] Use `AdminPageHeader` for title
- [ ] Add `AdminStatsRow` if relevant
- [ ] Use `AdminDataTable` for listings
- [ ] Use `StatusBadge` for status columns
- [ ] Use `TypeBadge` for type columns
- [ ] Use `AdminButton` for all actions
- [ ] Use `AdminFormField` for form inputs
- [ ] Test dark theme consistency
- [ ] Verify color contrast (4.5:1+)
- [ ] Test hover states
- [ ] Test mobile responsiveness
- [ ] Test keyboard navigation
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add empty states

---

## 📊 Visual Reference

### Stat Card Layout
```
┌─────────────────────────────────────┐
│ [🔵 Purple bg] 👥 STUDENTS [↑2%]   │
│                                     │
│ 256                                 │
│ registered                          │
│                                     │
│ (Hover: shadow increases)           │
└─────────────────────────────────────┘
```

### Badge Layout
```
[● Green Icon] ACTIVE        // StatusBadge
[📝] EXAM                   // TypeBadge
[●] ADMIN                   // RoleBadge
```

### Button Variants
```
[Purple bg] NEW ITEM                // primary + icon
[Slate bg] CANCEL                   // secondary
[Red bg] DELETE                     // danger
[Emerald bg] APPROVE                // success
[Amber bg] REVIEW NEEDED            // warning
[Transparent] MORE OPTIONS          // ghost
```

---

## ⚡ Performance Tips

- ✅ Use `useMemo` for columns array
- ✅ Use `useCallback` for handlers
- ✅ Implement pagination (don't load all data)
- ✅ Add loading skeleton screens
- ✅ Lazy load images/PDFs in tables
- ✅ Debounce search input
- ✅ Cache API responses when safe

---

## 🔗 Component Dependencies

```
StatusBadge, TypeBadge, RoleBadge
└─ lucide-react (icons)

AdminButton, AdminIconButton
└─ lucide-react (icons: Plus, Trash, etc.)

AdminDataTable
├─ AdminButton (for actions)
├─ StatusBadge, TypeBadge (for columns)
└─ lucide-react (Search, ChevronLeft, etc.)

AdminStatsRow
├─ lucide-react (Users, Upload, etc.)
└─ tailwind (gradients, colors)

AdminFormField
└─ lucide-react (Upload icon)
```

---

## 📦 Import Examples

```tsx
// All admin components
import { AdminButton, AdminIconButton } from '@/components/admin/AdminButton'
import { AdminDataTable } from '@/components/admin/AdminDataTable'
import { AdminFormField } from '@/components/admin/AdminFormField'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminStatsRow } from '@/components/admin/AdminStatsRow'
import { StatusBadge, TypeBadge, RoleBadge } from '@/components/admin/StatusBadge'

// Lucide icons
import { Plus, Trash, Edit, Download, Megaphone } from 'lucide-react'
```

---

**Ready to build awesome admin pages!** 🚀

Each of the 9 planned admin pages should follow this pattern and use these components consistently for a professional, cohesive admin experience.
