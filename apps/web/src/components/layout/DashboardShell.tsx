"use client"

import { useState } from "react"
import { Sidebar } from "./Sidebar"
import { TopBar } from "./TopBar"

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
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-8 animate-fade-in z-10 relative">
          {children}
        </main>
      </div>
    </div>
  )
}
