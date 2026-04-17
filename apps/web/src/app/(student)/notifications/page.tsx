export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Bell, CheckCircle2, Trash2 } from 'lucide-react'
import NotificationList from './NotificationList'
import PushNotificationManager from '@/components/PushNotificationManager'

export const metadata = {
  title: 'Notifications | IPE-24 Classroom',
}

export default async function NotificationsPage() {
  const session = await auth()
  const user = session?.user
  if (!user) redirect('/login')

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })

  const unreadCount = notifications.filter(n => !n.isRead).length
  const readCount = notifications.length - unreadCount

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 md:space-y-8 lg:space-y-10 pb-6 md:pb-20 min-w-0">
      <div className="glass rounded-[2rem] p-8 md:p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Bell className="w-32 h-32" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-brand-600 to-indigo-600 dark:from-brand-400 dark:to-indigo-400 text-transparent bg-clip-text mb-3">
              Notifications
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base max-w-xl">
              Stay updated with the latest announcements, file uploads, class schedule changes, and more.
            </p>
          </div>
          
          <div className="flex bg-white/50 dark:bg-slate-900/50 rounded-2xl p-2 gap-2 shadow-sm border border-white/40 dark:border-white/5 backdrop-blur-md">
            <div className="px-4 py-2 rounded-xl bg-brand-50/80 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 flex items-center gap-2 border border-brand-200/50 dark:border-brand-500/20">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-500"></span>
              </span>
              <span className="font-bold">{unreadCount} New</span>
            </div>
            <div className="px-4 py-2 rounded-xl text-slate-500 dark:text-slate-400 flex items-center gap-2">
               <span className="font-semibold">{readCount} Read</span>
            </div>
          </div>
        </div>
      </div>

      <PushNotificationManager />

      <NotificationList initialNotifications={notifications} />
    </div>
  )
}
