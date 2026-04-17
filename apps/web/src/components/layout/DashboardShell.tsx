"use client"

import { useState } from "react"
import { Sidebar } from "./Sidebar"
import { TopBar } from "./TopBar"
import { MobileBottomNav } from "./MobileBottomNav"
import PushNotificationManager from "@/components/PushNotificationManager"
import { PageTransition } from "@/components/animations/GSAPAnimations"

export function DashboardShell({ 
  children, 
  role, 
  user, 
  unreadCount = 0 
}: { 
  children: React.ReactNode
  role: string
  user: any
  unreadCount?: number
}) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-transparent">
      <Sidebar role={role} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="flex flex-col flex-1 overflow-hidden relative">
        <TopBar user={user} unreadCount={unreadCount} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto px-3 md:px-8 py-4 md:py-8 pb-20 md:pb-8 z-10 relative scroll-touch">
          <PushNotificationManager />
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </div>
      <MobileBottomNav role={role} />
    </div>
  )
}
