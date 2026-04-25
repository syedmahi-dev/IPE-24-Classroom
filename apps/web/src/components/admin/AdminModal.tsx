'use client'

import { useEffect, useRef, useCallback } from 'react'
import { X, Loader2 } from 'lucide-react'

import { Portal } from '../ui/Portal'

interface AdminModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  onSubmit?: () => void
  submitLabel?: string
  submitLoading?: boolean
  submitDisabled?: boolean
  destructive?: boolean
  maxWidth?: string
}

export function AdminModal({
  open,
  onClose,
  title,
  description,
  children,
  onSubmit,
  submitLabel = 'Save',
  submitLoading = false,
  submitDisabled = false,
  destructive = false,
  maxWidth = 'max-w-2xl',
}: AdminModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, handleKeyDown])

  if (!open) return null

  return (
    <Portal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div
          ref={overlayRef}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in"
          onClick={onClose}
        />
        <div
          className={`relative w-full ${maxWidth} bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl shadow-slate-950/50 border border-white/20 dark:border-white/5 animate-slide-up z-10 overflow-hidden`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between p-7 pb-0">
            <div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{title}</h2>
              {description && (
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1.5">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="p-2.5 -mt-1 -mr-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all active:scale-90"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-7 max-h-[75vh] overflow-y-auto scrollbar-hide">{children}</div>
          {onSubmit && (
            <div className="flex items-center justify-end gap-3 p-7 pt-4 border-t border-slate-100 dark:border-slate-800/50">
              <button
                onClick={onClose}
                disabled={submitLoading}
                className="px-6 py-3 text-sm font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onSubmit}
                data-testid="admin-modal-submit"
                disabled={submitLoading || submitDisabled}
                className={`px-6 py-3 text-sm font-bold text-white rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                  destructive
                    ? 'bg-gradient-to-r from-red-500 to-rose-600 shadow-red-500/25 hover:shadow-red-500/40'
                    : 'bg-gradient-to-r from-indigo-600 to-blue-600 shadow-indigo-600/25 hover:shadow-indigo-600/40'
                } hover:-translate-y-0.5`}
              >
                {submitLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitLabel}
              </button>
            </div>
          )}
        </div>
      </div>
    </Portal>
  )
}
