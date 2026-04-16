export const dynamic = 'force-dynamic';
'use client'

import { useState, useEffect } from 'react'
import { 
  Settings as SettingsIcon, Shield, Bell, Moon, Sun, Monitor, 
  Lock, Key, Globe, Eye, Loader2, Save, Sparkles, Smartphone, Check,
  AlertTriangle, Database, Zap
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'

import { SecuritySettings } from './components/SecuritySettings'

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [saving, setSaving] = useState(false)

  // Mock settings state
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    updates: true
  })
  
  const [privacy, setPrivacy] = useState({
    showEmail: false,
    showPhone: false,
  })

  useEffect(() => setMounted(true), [])

  if (status === 'loading' || !mounted) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-40">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin mb-4" />
        <p className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-sm">Loading Settings...</p>
      </div>
    )
  }

  const role: string = session?.user?.role || 'student'

  const handleSave = () => {
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      toast.success('Settings saved successfully')
    }, 800)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-fade-in">
      {/* Header */}
      <div className="relative group overflow-hidden rounded-[3rem]">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-600 to-indigo-600 blur-3xl opacity-20 dark:opacity-40 transition-opacity" />
        <div className="absolute inset-0 bg-mesh opacity-20" />
        <div className="relative glass border-none bg-transparent p-10 flex items-center justify-between z-10 shadow-2xl">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/20 dark:bg-black/20 flex items-center justify-center border border-white/30 dark:border-white/10 backdrop-blur-md shadow-inner">
               <SettingsIcon className="w-8 h-8 text-brand-700 dark:text-brand-300" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-1">
                Preferences
              </h1>
              <p className="text-slate-600 dark:text-slate-300 font-medium text-sm md:text-base flex items-center gap-2">
                Manage your account settings and application preferences
              </p>
            </div>
          </div>
          
          <button 
            onClick={handleSave}
            disabled={saving}
            className="hidden md:flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-brand-600 hover:bg-slate-800 dark:hover:bg-brand-500 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Essential Settings */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Theme & Appearance */}
          <section className="glass rounded-[2rem] p-8 md:p-10 shadow-sm border border-white/60 dark:border-slate-700/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full" />
            <div className="flex items-center gap-4 mb-6 relative z-10">
              <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-900/50">
                <Globe className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Appearance</h2>
            </div>
            
            <div className="grid grid-cols-3 gap-4 relative z-10">
              <button 
                onClick={() => setTheme('light')}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${
                  theme === 'light' 
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10 shadow-md' 
                    : 'border-transparent bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Sun className={`w-8 h-8 ${theme === 'light' ? 'text-orange-500' : 'text-slate-500 dark:text-slate-400'}`} />
                <span className={`text-sm font-bold ${theme === 'light' ? 'text-orange-600 dark:text-orange-400' : 'text-slate-600 dark:text-slate-400'}`}>Light</span>
              </button>
              
              <button 
                onClick={() => setTheme('dark')}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${
                  theme === 'dark' 
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-md' 
                    : 'border-transparent bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Moon className={`w-8 h-8 ${theme === 'dark' ? 'text-indigo-500' : 'text-slate-500 dark:text-slate-400'}`} />
                <span className={`text-sm font-bold ${theme === 'dark' ? 'text-indigo-400' : 'text-slate-600 dark:text-slate-400'}`}>Dark</span>
              </button>

              <button 
                onClick={() => setTheme('system')}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${
                  theme === 'system' 
                    ? 'border-slate-800 dark:border-slate-400 bg-slate-100 dark:bg-slate-700 shadow-md' 
                    : 'border-transparent bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Monitor className={`w-8 h-8 ${theme === 'system' ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`} />
                <span className={`text-sm font-bold ${theme === 'system' ? 'text-slate-800 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400'}`}>System</span>
              </button>
            </div>
          </section>

          {/* Notifications */}
          <section className="glass rounded-[2rem] p-8 md:p-10 shadow-sm border border-white/60 dark:border-slate-700/50 relative overflow-hidden">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
                <Bell className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Notifications</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <h4 className="text-slate-800 dark:text-slate-200 font-bold">Email Updates</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Receive weekly summaries and critical alerts</p>
                  </div>
                </div>
                {/* Custom Toggle Switch */}
                <button 
                  onClick={() => setNotifications({ ...notifications, email: !notifications.email })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${notifications.email ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${notifications.email ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <h4 className="text-slate-800 dark:text-slate-200 font-bold">Push Notifications</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Get instant alerts for assignments and polls</p>
                  </div>
                </div>
                <button 
                  onClick={() => setNotifications({ ...notifications, push: !notifications.push })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${notifications.push ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${notifications.push ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </section>

          {/* Privacy & Security */}
          <section className="glass rounded-[2rem] p-8 md:p-10 shadow-sm border border-white/60 dark:border-slate-700/50">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Privacy & Security</h2>
            </div>
            
            <div className="space-y-4">
               <div className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <h4 className="text-slate-800 dark:text-slate-200 font-bold">Show Email Info</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Let classmates view your email address</p>
                  </div>
                </div>
                <button 
                  onClick={() => setPrivacy({ ...privacy, showEmail: !privacy.showEmail })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${privacy.showEmail ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${privacy.showEmail ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="mt-6">
                {(role === 'admin' || role === 'super_admin') && (
                  <SecuritySettings role={role} />
                )}
              </div>
            </div>
          </section>

        </div>

        {/* Right Column: Dynamic Role-based Settings */}
        <div className="space-y-8">
          
          <div className="glass rounded-[2rem] p-8 shadow-sm border border-white/60 dark:border-slate-700/50 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800">
             <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center mb-4">
                   <Shield className="w-8 h-8 text-brand-600 dark:text-brand-400" />
                </div>
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">Account Access</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Current Role</p>
             </div>
             
             <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 flex items-center justify-between border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {role === 'super_admin' ? 'Super Admin Profile' : role === 'admin' ? 'Admin Profile' : 'Student Profile'}
                </span>
                <Sparkles className="w-5 h-5 text-amber-500" />
             </div>
          </div>

          {(role === 'admin' || role === 'super_admin') && (
            <div className="glass rounded-[2rem] p-8 shadow-lg border border-red-500/20 bg-gradient-to-b from-red-50/50 to-transparent dark:from-red-900/10">
               <div className="flex items-center gap-3 mb-6">
                 <AlertTriangle className="w-5 h-5 text-red-500" />
                 <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">Admin Options</h3>
               </div>
               
               <div className="space-y-3">
                 {role === 'super_admin' && (
                   <button className="w-full flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-red-300 transition-colors group">
                     <div className="flex items-center gap-3">
                        <Database className="w-4 h-4 text-slate-400 group-hover:text-red-500 transition-colors" />
                        <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">Clear Cache & Logs</span>
                     </div>
                   </button>
                 )}
                 
                 <button className="w-full flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-red-300 transition-colors group">
                   <div className="flex items-center gap-3">
                      <Zap className="w-4 h-4 text-slate-400 group-hover:text-red-500 transition-colors" />
                      <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">Force Sync Data</span>
                   </div>
                 </button>
               </div>
            </div>
          )}

        </div>
      </div>
      
      {/* Mobile Sticky Save Button */}
      <div className="md:hidden fixed bottom-6 left-6 right-6 z-50">
         <button 
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-brand-600 text-white font-bold rounded-2xl shadow-2xl shadow-brand-600/30 active:scale-95 disabled:opacity-50"
         >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save Changes
         </button>
      </div>
    </div>
  )
}
