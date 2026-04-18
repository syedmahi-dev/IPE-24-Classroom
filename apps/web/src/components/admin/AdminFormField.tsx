'use client'

import { useId } from 'react'
import { Upload } from 'lucide-react'

interface BaseFieldProps {
  label: string
  error?: string
  required?: boolean
  hint?: string
}

interface TextFieldProps extends BaseFieldProps {
  type: 'text' | 'email' | 'number' | 'url'
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

interface TextareaFieldProps extends BaseFieldProps {
  type: 'textarea'
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}

interface SelectFieldProps extends BaseFieldProps {
  type: 'select'
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
}

interface DateTimeFieldProps extends BaseFieldProps {
  type: 'datetime'
  value: string
  onChange: (value: string) => void
}

interface FileFieldProps extends BaseFieldProps {
  type: 'file'
  onChange: (files: FileList | null) => void
  accept?: string
}

interface CheckboxFieldProps extends BaseFieldProps {
  type: 'checkbox'
  checked: boolean
  onChange: (checked: boolean) => void
}

export type AdminFormFieldProps =
  | TextFieldProps
  | TextareaFieldProps
  | SelectFieldProps
  | DateTimeFieldProps
  | FileFieldProps
  | CheckboxFieldProps

const baseInputClass =
  'w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-800 dark:text-slate-100 font-semibold text-sm focus:outline-none focus:ring-4 focus:ring-purple-500/15 dark:focus:ring-purple-500/30 focus:bg-white dark:focus:bg-slate-950/60 focus:border-purple-400 dark:focus:border-purple-500/40 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-medium'
const errorInputClass = 'border-red-400 dark:border-red-500/50 focus:ring-red-500/10 dark:focus:ring-red-500/20 focus:border-red-500 dark:focus:border-red-500/60'

export function AdminFormField(props: AdminFormFieldProps) {
  const id = useId()
  const hasError = !!props.error

  if (props.type === 'checkbox') {
    return (
      <label htmlFor={id} className="flex items-center gap-3 cursor-pointer group py-1">
        <input
          id={id}
          type="checkbox"
          checked={props.checked}
          onChange={(e) => props.onChange(e.target.checked)}
          className="w-5 h-5 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900/40 text-purple-500 focus:ring-purple-500/30 focus:ring-offset-0 cursor-pointer transition-all"
        />
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
          {props.label}
        </span>
        {props.required && <span className="text-red-400 text-xs font-bold">*</span>}
      </label>
    )
  }

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="flex items-center gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-300">
        {props.label}
        {props.required && <span className="text-red-400">*</span>}
      </label>

      {props.type === 'textarea' ? (
        <textarea
          id={id}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder={props.placeholder}
          rows={props.rows ?? 4}
          className={`${baseInputClass} resize-none ${hasError ? errorInputClass : ''}`}
        />
      ) : props.type === 'select' ? (
        <select
          id={id}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          className={`${baseInputClass} cursor-pointer ${hasError ? errorInputClass : ''}`}
        >
          {props.placeholder && (
            <option value="" disabled>
              {props.placeholder}
            </option>
          )}
          {props.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : props.type === 'datetime' ? (
        <input
          id={id}
          type="datetime-local"
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          className={`${baseInputClass} ${hasError ? errorInputClass : ''}`}
        />
      ) : props.type === 'file' ? (
        <div
          className={`relative border-2 border-dashed rounded-2xl p-6 text-center hover:border-purple-500/40 hover:bg-purple-50 dark:hover:bg-purple-500/5 transition-all cursor-pointer backdrop-blur-sm bg-slate-50 dark:bg-slate-900/30 ${
            hasError ? 'border-red-400 dark:border-red-500/40' : 'border-slate-300 dark:border-slate-700/50'
          }`}
        >
          <input
            id={id}
            type="file"
            onChange={(e) => props.onChange(e.target.files)}
            accept={props.accept}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="space-y-2">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-purple-100 dark:from-purple-500/20 to-purple-50 dark:to-purple-600/10 border border-purple-200 dark:border-purple-500/20 flex items-center justify-center">
              <Upload className="w-5 h-5 text-purple-500 dark:text-purple-300" />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Click or drag to upload</p>
            {props.accept && (
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Accepts: {props.accept}</p>
            )}
          </div>
        </div>
      ) : (
        <input
          id={id}
          type={props.type}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder={props.placeholder}
          className={`${baseInputClass} ${hasError ? errorInputClass : ''}`}
        />
      )}

      {props.hint && !hasError && (
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">{props.hint}</p>
      )}
      {hasError && <p className="text-xs font-bold text-red-400 mt-1">{props.error}</p>}
    </div>
  )
}
