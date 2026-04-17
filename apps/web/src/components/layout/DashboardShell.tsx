"use client"

import { useState, useRef } from "react"
import { Sidebar } from "./Sidebar"
import { TopBar } from "./TopBar"
import { MobileBottomNav } from "./MobileBottomNav"
import PushNotificationManager from "@/components/PushNotificationManager"

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
    <div className="flex h-[100dvh] overflow-hidden bg-transparent">
      <Sidebar role={role} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="flex flex-col flex-1 overflow-hidden relative min-w-0">
        <TopBar user={user} unreadCount={unreadCount} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 md:px-8 lg:px-10 2xl:px-12 py-4 md:py-8 pb-20 md:pb-8 z-10 relative scroll-touch">
          <PushNotificationManager />
          <div className="animate-fade-in">{children}</div>
        </main>
      </div>
      <MobileBottomNav role={role} />
    </div>
  )
}
