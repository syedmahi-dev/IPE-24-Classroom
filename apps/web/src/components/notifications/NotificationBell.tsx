"use client"

import { Bell } from "lucide-react"

export function NotificationBell() {
  return (
    <button title="Notifications" aria-label="Notifications" className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500">
      <Bell className="h-5 w-5" />
      <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
    </button>
  )
}
