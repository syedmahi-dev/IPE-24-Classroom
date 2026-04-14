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
  'w-full px-4 py-3.5 bg-white/70 border border-slate-200 rounded-xl text-slate-800 font-semibold text-sm focus:outline-none focus:ring-4 focus:ring-admin-purple/10 focus:border-admin-purple/40 transition-all placeholder:text-slate-400 placeholder:font-medium'
const errorInputClass = 'border-red-300 focus:ring-red-500/10 focus:border-red-400'

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
          className="w-5 h-5 rounded-lg border-2 border-slate-300 text-admin-purple focus:ring-admin-purple/30 focus:ring-offset-0 cursor-pointer transition-all"
        />
        <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
          {props.label}
        </span>
        {props.required && <span className="text-red-400 text-xs font-bold">*</span>}
      </label>
    )
  }

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
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
          className={`relative border-2 border-dashed rounded-2xl p-6 text-center hover:border-admin-purple/40 hover:bg-admin-purple/5 transition-all cursor-pointer ${
            hasError ? 'border-red-300' : 'border-slate-200'
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
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center">
              <Upload className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm font-bold text-slate-600">Click or drag to upload</p>
            {props.accept && (
              <p className="text-xs font-medium text-slate-400">Accepts: {props.accept}</p>
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
        <p className="text-xs font-medium text-slate-400 mt-1">{props.hint}</p>
      )}
      {hasError && <p className="text-xs font-bold text-red-500 mt-1">{props.error}</p>}
    </div>
  )
}
