'use client'

import { useEffect, useState } from 'react'
import { User, Mail, Phone, Book, Settings, Save, Shield, Loader2, Sparkles, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { signOut } from 'next-auth/react'
export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Edit states
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [phone, setPhone] = useState('')
  const [bio, setBio] = useState('')
  const [bloodGroup, setBloodGroup] = useState('')
  const [gender, setGender] = useState('')
  const [dob, setDob] = useState('')

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/v1/profile')
      
      if (res.status === 401 || res.status === 404) {
        toast.error('Session expired or invalid. Please sign in again.')
        await signOut({ callbackUrl: '/login' })
        return
      }

      const result = await res.json()
      if (!result.success) throw new Error(result.error?.message)
      
      setProfile(result.data)
      setName(result.data.name || '')
      setNickname(result.data.nickname || '')
      setPhone(result.data.phone || '')
      setBio(result.data.bio || '')
      setBloodGroup(result.data.bloodGroup || '')
      setGender(result.data.gender || '')
      setDob(result.data.dob || '')
    } catch (err) {
      toast.error('Failed to load profile')
    } finally {
      if (loading) setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/v1/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, nickname, phone, bio, bloodGroup, gender, dob })
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error?.message)
      
      toast.success('Profile updated successfully')
      setProfile(result.data)
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-40">
        <Loader2 className="w-12 h-12 text-slate-400 dark:text-slate-500 animate-spin mb-4" />
        <p className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-sm">Loading Identity...</p>
      </div>
    )
  }

  if (!profile) return null

  const stats = [
    { label: 'Files Uploaded', value: profile._count?.fileUploads || 0 },
    { label: 'Polls Voted', value: profile._count?.votes || 0 },
    { label: 'Study Groups', value: profile._count?.studyGroups || 0 },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="relative group overflow-hidden rounded-[3rem]">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-800 to-slate-900 blur-3xl opacity-90 transition-opacity" />
        <div className="absolute inset-0 bg-mesh opacity-20" />
        <div className="relative glass border-none bg-transparent p-10 md:p-14 flex flex-col md:flex-row items-center gap-10 z-10 text-white shadow-2xl">
          
          <div className="relative group/avatar cursor-pointer">
            <div className="w-32 h-32 rounded-[2rem] overflow-hidden border-4 border-white/20 shadow-2xl">
               <img 
                 src={profile.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${profile.name}&backgroundColor=0f172a&textColor=ffffff`} 
                 alt="Avatar" 
                 className="w-full h-full object-cover group-hover/avatar:scale-110 transition-transform duration-500"
               />
            </div>
            <div className="absolute inset-0 bg-black/40 rounded-[2rem] opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
               <Upload className="w-8 h-8 text-white" />
            </div>
            {profile.role === 'super_admin' && (
              <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg border-4 border-slate-900 transform rotate-12 group-hover/avatar:rotate-0 transition-transform">
                 <Shield className="w-5 h-5 text-white" />
              </div>
            )}
          </div>

          <div className="text-center md:text-left flex-1">
             <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20 mb-4">
               <Sparkles className="w-4 h-4 text-amber-400" />
               <span className="text-xs font-bold uppercase tracking-widest text-slate-200">
                 {profile.role === 'super_admin' ? 'Super Admin' : profile.role === 'admin' ? 'Class Representative' : 'Student'}
               </span>
             </div>
             <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2">{profile.name}</h1>
             <p className="text-slate-300 dark:text-slate-200 font-medium text-lg flex items-center justify-center md:justify-start gap-2">
               <Mail className="w-4 h-4 opacity-70" /> {profile.email}
             </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((s, i) => (
          <div key={i} className="glass rounded-[2rem] p-8 text-center bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl hover:-translate-y-1 transition-all border border-white/60 dark:border-slate-700/50">
             <div className="text-4xl font-black text-slate-800 dark:text-slate-100 mb-2">{s.value}</div>
             <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="glass rounded-[2rem] p-8 md:p-10 shadow-sm border border-white/60 dark:border-slate-700/50">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50">
             <Settings className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Profile Settings</h2>
        </div>

        <div className="space-y-6 max-w-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Display Name</label>
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)}
                className="w-full px-5 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-500/10 focus:border-slate-400 font-bold text-slate-700 dark:text-slate-200 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Nick Name</label>
              <input 
                type="text" 
                value={nickname} 
                onChange={e => setNickname(e.target.value)}
                placeholder="e.g. John"
                className="w-full px-5 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-500/10 focus:border-slate-400 font-bold text-slate-700 dark:text-slate-200 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Phone Number</label>
              <input 
                type="text" 
                value={phone} 
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g. +8801..."
                className="w-full px-5 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-500/10 focus:border-slate-400 font-bold text-slate-700 dark:text-slate-200 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Date of Birth</label>
              <input 
                type="text" 
                value={dob} 
                onChange={e => setDob(e.target.value)}
                placeholder="e.g. DD/MM/YYYY"
                className="w-full px-5 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-500/10 focus:border-slate-400 font-bold text-slate-700 dark:text-slate-200 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Blood Group</label>
              <input 
                type="text" 
                value={bloodGroup} 
                onChange={e => setBloodGroup(e.target.value)}
                placeholder="e.g. O+"
                className="w-full px-5 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-500/10 focus:border-slate-400 font-bold text-slate-700 dark:text-slate-200 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Gender</label>
              <select 
                value={gender} 
                onChange={e => setGender(e.target.value)}
                className="w-full px-5 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-500/10 focus:border-slate-400 font-bold text-slate-700 dark:text-slate-200 transition-all"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Bio / Status</label>
            <textarea 
              value={bio} 
              onChange={e => setBio(e.target.value)}
              rows={3}
              placeholder="What's on your mind?"
              className="w-full px-5 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-500/10 focus:border-slate-400 font-bold text-slate-700 dark:text-slate-200 transition-all resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
          
          <div className="pt-4 mt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button 
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-8 py-4 bg-slate-800 dark:bg-indigo-600 hover:bg-slate-900 dark:hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-slate-800/20 active:scale-95 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
