'use client'

import { useState } from 'react'
import { AdminModal } from './AdminModal'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message: string
  confirmLabel?: string
  loading?: boolean
  typeToConfirm?: string
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirm Deletion',
  message,
  confirmLabel = 'Delete',
  loading = false,
  typeToConfirm,
}: ConfirmDialogProps) {
  const [confirmText, setConfirmText] = useState('')
  const canConfirm = typeToConfirm ? confirmText === typeToConfirm : true

  const handleClose = () => {
    setConfirmText('')
    onClose()
  }

  const handleConfirm = () => {
    if (!canConfirm) return
    onConfirm()
    setConfirmText('')
  }

  return (
    <AdminModal
      open={open}
      onClose={handleClose}
      title={title}
      onSubmit={handleConfirm}
      submitLabel={confirmLabel}
      submitLoading={loading}
      submitDisabled={!canConfirm}
      destructive
      maxWidth="max-w-md"
    >
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 flex items-center justify-center shadow-sm">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed text-sm">{message}</p>
        {typeToConfirm && (
          <div className="w-full space-y-2 text-left">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Type <span className="font-black text-red-500">{typeToConfirm}</span> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={typeToConfirm}
              className="w-full px-4 py-3 bg-red-50/50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-4 focus:ring-red-500/10 dark:focus:ring-red-500/20 focus:border-red-300 dark:focus:border-red-500/30 transition-all placeholder:font-medium placeholder:text-red-300 dark:placeholder:text-red-400/50"
            />
          </div>
        )}
      </div>
    </AdminModal>
  )
}
