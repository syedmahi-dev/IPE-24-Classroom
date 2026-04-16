import { describe, it, expect } from 'vitest'
import { cn } from '../utils'

describe('cn', () => {
  it('merges simple class strings', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2')
  })

  it('deduplicates conflicting tailwind classes (last wins)', () => {
    const result = cn('px-4', 'px-6')
    expect(result).toBe('px-6')
  })

  it('handles conditional classes via clsx syntax', () => {
    const result = cn('base', false && 'hidden', 'extra')
    expect(result).toBe('base extra')
  })

  it('merges object-based classes', () => {
    const result = cn({ 'text-red-500': true, 'text-blue-500': false })
    expect(result).toBe('text-red-500')
  })

  it('handles undefined and null inputs', () => {
    const result = cn('px-4', undefined, null, 'py-2')
    expect(result).toBe('px-4 py-2')
  })

  it('handles empty string input', () => {
    expect(cn('')).toBe('')
  })

  it('handles no arguments', () => {
    expect(cn()).toBe('')
  })

  it('handles array inputs', () => {
    const result = cn(['px-4', 'py-2'])
    expect(result).toBe('px-4 py-2')
  })

  it('resolves tailwind variant conflicts correctly', () => {
    // twMerge should keep the last conflicting class
    const result = cn('bg-red-500', 'bg-blue-500')
    expect(result).toBe('bg-blue-500')
  })
})
