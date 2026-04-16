'use client'

import { useState, useEffect } from 'react'
import { Lock, Key, ShieldCheck, ShieldAlert, Loader2, QrCode } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

export function SecuritySettings({ role }: { role: string }) {
  const [loading, setLoading] = useState(true)
  const [securityData, setSecurityData] = useState<{ hasPassword: boolean; twoFactorEnabled: boolean } | null>(null)

  // Password fields
  const [password, setPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  // 2FA fields
  const [setup2fa, setSetup2fa] = useState<{ secret: string; qrCode: string } | null>(null)
  const [otpToken, setOtpToken] = useState('')
  const [saving2fa, setSaving2fa] = useState(false)

  useEffect(() => {
    fetch('/api/v1/auth/security')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setSecurityData(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handlePasswordSave = async () => {
    if (password.length < 8) return toast.error('Password must be at least 8 characters')
    setSavingPassword(true)
    try {
      const res = await fetch('/api/v1/auth/password', {
        method: 'POST',
        body: JSON.stringify({ password }),
        headers: { 'Content-Type': 'application/json' }
      })
      if (res.ok) {
        toast.success('Password updated successfully')
        setPassword('')
        setSecurityData(prev => prev ? { ...prev, hasPassword: true } : null)
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to update password')
      }
    } catch {
      toast.error('An error occurred')
    }
    setSavingPassword(false)
  }

  const handleGenerate2fa = async () => {
    setSaving2fa(true)
    try {
      const res = await fetch('/api/v1/auth/2fa/generate', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setSetup2fa({ secret: data.secret, qrCode: data.qrCodeDataUrl })
      } else {
        toast.error(data.error || 'Failed to generate 2FA')
      }
    } catch {
      toast.error('An error occurred')
    }
    setSaving2fa(false)
  }

  const handleVerify2fa = async () => {
    if (otpToken.length < 6) return toast.error('Enter a valid 6-digit OTP')
    setSaving2fa(true)
    try {
      const res = await fetch('/api/v1/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: otpToken })
      })
      if (res.ok) {
        toast.success('2FA successfully enabled')
        setSetup2fa(null)
        setOtpToken('')
        setSecurityData(prev => prev ? { ...prev, twoFactorEnabled: true } : null)
      } else {
        const error = await res.json()
        toast.error(error.error || 'Invalid OTP')
      }
    } catch {
      toast.error('An error occurred')
    }
    setSaving2fa(false)
  }

  const handleDisable2fa = async () => {
    setSaving2fa(true)
    try {
      const res = await fetch('/api/v1/auth/2fa/disable', { method: 'POST' })
      if (res.ok) {
        toast.success('2FA successfully disabled')
        setSecurityData(prev => prev ? { ...prev, twoFactorEnabled: false } : null)
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to disable 2FA')
      }
    } catch {
      toast.error('An error occurred')
    }
    setSaving2fa(false)
  }

  if (loading) {
    return <div className="flex justify-center p-6"><Loader2 className="animate-spin text-slate-400" /></div>
  }

  return (
    <div className="space-y-6 mt-6 border-t border-slate-200 dark:border-slate-700 pt-6">
      
      {/* Password Management */}
      <h4 className="text-slate-800 dark:text-slate-200 font-bold flex items-center gap-2">
        <Key className="w-5 h-5 text-indigo-500" />
        Administrator Login Credentials
      </h4>
      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {securityData?.hasPassword 
            ? 'Update your administrator password here.' 
            : 'You do not have a password set. Set one to enable administrator login.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input 
            type="password" 
            placeholder="New admin password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow"
          />
          <button 
            onClick={handlePasswordSave}
            disabled={savingPassword || password.length < 8}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {savingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
            {securityData?.hasPassword ? 'Update Password' : 'Set Password'}
          </button>
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <h4 className="text-slate-800 dark:text-slate-200 font-bold flex items-center gap-2 mt-8">
        <ShieldCheck className="w-5 h-5 text-emerald-500" />
        Two-Factor Authentication (2FA)
      </h4>
      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-4">
        {role === 'super_admin' && !securityData?.twoFactorEnabled && (
          <div className="flex gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl mb-4 items-center">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>Super Admins are strongly required to enable 2FA!</span>
          </div>
        )}
        
        {securityData?.twoFactorEnabled ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Two-Factor Authentication is currently enabled.
            </p>
            <button 
              onClick={handleDisable2fa}
              disabled={saving2fa}
              className="px-5 py-2.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold rounded-xl disabled:opacity-50 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              {saving2fa && <Loader2 className="w-4 h-4 animate-spin" />}
              Disable 2FA
            </button>
          </div>
        ) : !setup2fa ? (
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Add an extra layer of security using an authenticator app (like Google Authenticator).
            </p>
            <button 
              onClick={handleGenerate2fa}
              disabled={saving2fa}
              className="px-5 py-2.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold rounded-xl disabled:opacity-50 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors flex items-center gap-2"
            >
              {saving2fa && <Loader2 className="w-4 h-4 animate-spin" />}
              Begin 2FA Setup
            </button>
          </div>
        ) : (
          <div className="space-y-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-emerald-200 dark:border-emerald-900">
            <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400 mb-3">
              <QrCode className="w-5 h-5" />
              <h5 className="font-bold">Scan this QR Code</h5>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Open your authenticator app and scan this QR code. Once scanned, enter the 6-digit code below to finish setup.
            </p>
            <div className="bg-white p-2 rounded-xl inline-block">
              <Image src={setup2fa.qrCode} alt="2FA QR Code" width={160} height={160} />
            </div>
            <div className="flex gap-3 pt-2">
              <input 
                type="text" 
                maxLength={6}
                placeholder="000000" 
                value={otpToken}
                onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, ''))}
                className="w-32 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center font-mono text-lg tracking-widest"
              />
              <button 
                onClick={handleVerify2fa}
                disabled={saving2fa || otpToken.length !== 6}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {saving2fa && <Loader2 className="w-4 h-4 animate-spin" />}
                Verify & Enable
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
