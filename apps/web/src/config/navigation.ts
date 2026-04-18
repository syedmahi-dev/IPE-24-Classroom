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
  { href: '/settings',      label: 'Settings',       icon: 'Settings' },
]

export const ADMIN_NAV = [
  // ADMIN FEATURES
  { href: '/admin',                 label: 'Admin Dashboard', icon: 'LayoutDashboard', section: 'Admin' },
  { href: '/admin/announcements',   label: 'Announcements',   icon: 'Megaphone', section: 'Admin' },
  { href: '/admin/files',           label: 'Manage Files',    icon: 'Upload', section: 'Admin' },
  { href: '/admin/exams',           label: 'Manage Exams',    icon: 'BookOpen', section: 'Admin' },
  { href: '/admin/routine',         label: 'Manage Routine',  icon: 'CalendarClock', section: 'Admin' },
  { href: '/admin/polls',           label: 'Manage Polls',    icon: 'Vote', section: 'Admin' },
  { href: '/admin/courses',         label: 'Courses',         icon: 'FolderOpen', section: 'Admin' },
  { href: '/admin/knowledge',       label: 'AI Knowledge',    icon: 'Brain', section: 'Admin' },
  { href: '/admin/users',           label: 'Users & Roles',   icon: 'Users', section: 'Admin', superAdminOnly: true },
  { href: '/admin/audit',           label: 'Audit Log',       icon: 'ScrollText', section: 'Admin', superAdminOnly: true },
  { href: '/admin/telegram',        label: 'Telegram Bot',    icon: 'MessageCircle', section: 'Admin', superAdminOnly: true },
  { href: '/admin/drives',          label: 'Drives',          icon: 'HardDrive', section: 'Admin', superAdminOnly: true },

  // STUDENT FEATURES (accessible to admin as well)
  { href: '/announcements',         label: 'View Announcements', icon: 'Megaphone', section: 'Student Access' },
  { href: '/routine',               label: 'Class Routine',   icon: 'Calendar', section: 'Student Access' },
  { href: '/resources',             label: 'Resources',       icon: 'FolderOpen', section: 'Student Access' },
  { href: '/exams',                 label: 'My Exams',        icon: 'FileText', section: 'Student Access' },
  { href: '/polls',                 label: 'Polls',           icon: 'BarChart2', section: 'Student Access' },
  { href: '/study-groups',          label: 'Study Groups',    icon: 'Users', section: 'Student Access' },
  { href: '/chat',                  label: 'Virtual CR',      icon: 'MessageCircle', section: 'Student Access' },
  
  // SETTINGS
  { href: '/profile',               label: 'Profile',         icon: 'User', section: 'Personal' },
  { href: '/settings',              label: 'Settings',        icon: 'Settings', section: 'Personal' },
]
