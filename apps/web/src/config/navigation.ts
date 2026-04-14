export const STUDENT_NAV = [
  { href: '/dashboard',     label: 'Dashboard',      icon: 'LayoutDashboard' },
  { href: '/announcements', label: 'Announcements',  icon: 'Megaphone' },
  { href: '/routine',       label: 'Class Routine',  icon: 'Calendar' },
  { href: '/resources',     label: 'Resources',      icon: 'FolderOpen' },
  { href: '/exams',         label: 'Exams',          icon: 'FileText' },
  { href: '/polls',         label: 'Polls',          icon: 'BarChart2' },
  { href: '/study-groups',  label: 'Study Groups',   icon: 'Users' },
  { href: '/chat',          label: 'Virtual CR',     icon: 'MessageCircle' },
  { href: '/profile',       label: 'Profile',        icon: 'User' },
]

export const ADMIN_NAV = [
  { href: '/admin',                 label: 'Dashboard',       icon: 'LayoutDashboard' },
  { href: '/admin/announcements',   label: 'Announcements',   icon: 'Megaphone' },
  { href: '/admin/files',           label: 'Files',           icon: 'Upload' },
  { href: '/admin/exams',           label: 'Exams',           icon: 'BookOpen' },
  { href: '/admin/polls',           label: 'Polls',           icon: 'Vote' },
  { href: '/admin/knowledge',       label: 'AI Knowledge',    icon: 'Brain' },
  { href: '/admin/users',           label: 'Users',           icon: 'Users', superAdminOnly: true },
  { href: '/admin/audit',           label: 'Audit Log',       icon: 'ScrollText', superAdminOnly: true },
  { href: '/admin/settings',        label: 'System Settings', icon: 'Settings', superAdminOnly: true },
  { href: '/admin/telegram',        label: 'Telegram Bot',    icon: 'MessageCircle', superAdminOnly: true },
]
