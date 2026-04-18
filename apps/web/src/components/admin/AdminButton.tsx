'use client'

import { LucideIcon, Loader2 } from 'lucide-react'

type AdminButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost'
type AdminButtonSize = 'sm' | 'md' | 'lg'

interface AdminButtonProps {
  variant?: AdminButtonVariant
  size?: AdminButtonSize
  icon?: LucideIcon
  loading?: boolean
  disabled?: boolean
  onClick?: () => void
  className?: string
  children: React.ReactNode
}

const variantStyles = {
  primary: 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white border border-purple-500/30 shadow-lg hover:shadow-xl',
  secondary: 'bg-slate-100 dark:bg-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-600/80 text-slate-700 dark:text-slate-100 border border-slate-200 dark:border-slate-600/50 shadow-md hover:shadow-lg',
  danger: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white border border-red-500/30 shadow-lg hover:shadow-xl',
  success: 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white border border-emerald-500/30 shadow-lg hover:shadow-xl',
  warning: 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white border border-amber-500/30 shadow-lg hover:shadow-xl',
  ghost: 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600/50',
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-xs font-bold rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-sm font-bold rounded-xl gap-2',
  lg: 'px-6 py-3.5 text-base font-bold rounded-2xl gap-2.5',
}

export function AdminButton({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading = false,
  disabled = false,
  onClick,
  className = '',
  children,
}: AdminButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {loading ? (
        <Loader2 className={`animate-spin ${size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'}`} />
      ) : Icon ? (
        <Icon className={size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'} />
      ) : null}
      {children}
    </button>
  )
}

export function AdminIconButton({
  variant = 'ghost',
  size = 'md',
  icon: Icon,
  loading = false,
  disabled = false,
  onClick,
  className = '',
  title,
}: Omit<AdminButtonProps, 'children'> & { icon: LucideIcon; title?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      className={`inline-flex items-center justify-center font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {loading ? (
        <Loader2 className={`animate-spin ${size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'}`} />
      ) : (
        <Icon className={size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'} />
      )}
    </button>
  )
}
