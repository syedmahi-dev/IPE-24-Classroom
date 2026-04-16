import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AdminFormField } from '../AdminFormField'

describe('AdminFormField', () => {
  describe('text input', () => {
    it('renders a text input with label', () => {
      render(
        <AdminFormField type="text" label="Title" value="" onChange={vi.fn()} />
      )
      expect(screen.getByLabelText('Title')).toBeInTheDocument()
    })

    it('calls onChange when typing', () => {
      const onChange = vi.fn()
      render(
        <AdminFormField type="text" label="Title" value="" onChange={onChange} />
      )
      fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Hello' } })
      expect(onChange).toHaveBeenCalledWith('Hello')
    })

    it('shows error message when provided', () => {
      render(
        <AdminFormField type="text" label="Title" value="" onChange={vi.fn()} error="Required field" />
      )
      expect(screen.getByText('Required field')).toBeInTheDocument()
    })

    it('shows required indicator', () => {
      render(
        <AdminFormField type="text" label="Title" value="" onChange={vi.fn()} required />
      )
      expect(screen.getByText('*')).toBeInTheDocument()
    })
  })

  describe('select input', () => {
    const options = [
      { value: 'a', label: 'Option A' },
      { value: 'b', label: 'Option B' },
    ]

    it('renders all options', () => {
      render(
        <AdminFormField type="select" label="Category" value="" onChange={vi.fn()} options={options} />
      )
      expect(screen.getByText('Option A')).toBeInTheDocument()
      expect(screen.getByText('Option B')).toBeInTheDocument()
    })

    it('calls onChange when selecting', () => {
      const onChange = vi.fn()
      render(
        <AdminFormField type="select" label="Category" value="a" onChange={onChange} options={options} />
      )
      fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'b' } })
      expect(onChange).toHaveBeenCalledWith('b')
    })
  })

  describe('textarea', () => {
    it('renders a textarea', () => {
      render(
        <AdminFormField type="textarea" label="Body" value="" onChange={vi.fn()} />
      )
      expect(screen.getByLabelText('Body')).toBeInTheDocument()
      expect(screen.getByLabelText('Body').tagName).toBe('TEXTAREA')
    })
  })

  describe('checkbox', () => {
    it('renders a checkbox with label', () => {
      render(
        <AdminFormField type="checkbox" label="Accept Terms" checked={false} onChange={vi.fn()} />
      )
      expect(screen.getByLabelText('Accept Terms')).toBeInTheDocument()
    })

    it('calls onChange with boolean', () => {
      const onChange = vi.fn()
      render(
        <AdminFormField type="checkbox" label="Active" checked={false} onChange={onChange} />
      )
      fireEvent.click(screen.getByLabelText('Active'))
      expect(onChange).toHaveBeenCalledWith(true)
    })
  })

  describe('file input', () => {
    it('renders a file upload area', () => {
      render(
        <AdminFormField type="file" label="Attachment" onChange={vi.fn()} />
      )
      expect(screen.getByText(/click or drag to upload/i)).toBeInTheDocument()
    })
  })

  describe('datetime input', () => {
    it('renders a datetime-local input', () => {
      const onChange = vi.fn()
      render(
        <AdminFormField type="datetime" label="Exam Date" value="" onChange={onChange} />
      )
      expect(screen.getByLabelText('Exam Date')).toBeInTheDocument()
    })
  })
})
