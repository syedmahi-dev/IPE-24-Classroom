import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ConfirmDialog } from '../ConfirmDialog'

// Mock Portal to render inline
vi.mock('@/components/ui/Portal', () => ({
  Portal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe('ConfirmDialog', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    message: 'Are you sure you want to delete this item?',
  }

  it('renders the message and default title', () => {
    render(<ConfirmDialog {...defaultProps} />)
    expect(screen.getByText('Confirm Deletion')).toBeInTheDocument()
    expect(screen.getByText('Are you sure you want to delete this item?')).toBeInTheDocument()
  })

  it('renders a custom title', () => {
    render(<ConfirmDialog {...defaultProps} title="Remove User" />)
    expect(screen.getByText('Remove User')).toBeInTheDocument()
  })

  it('calls onConfirm when submit button is clicked', () => {
    const onConfirm = vi.fn()
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />)

    fireEvent.click(screen.getByTestId('admin-modal-submit'))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('disables submit when typeToConfirm is required but not matched', () => {
    render(<ConfirmDialog {...defaultProps} typeToConfirm="DELETE" />)
    expect(screen.getByTestId('admin-modal-submit')).toBeDisabled()
  })

  it('enables submit when user types the confirmation text', () => {
    render(<ConfirmDialog {...defaultProps} typeToConfirm="DELETE" />)
    
    const input = screen.getByPlaceholderText('DELETE')
    fireEvent.change(input, { target: { value: 'DELETE' } })
    
    expect(screen.getByTestId('admin-modal-submit')).not.toBeDisabled()
  })

  it('does not call onConfirm if typeToConfirm text does not match', () => {
    const onConfirm = vi.fn()
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} typeToConfirm="DELETE" />)

    const input = screen.getByPlaceholderText('DELETE')
    fireEvent.change(input, { target: { value: 'WRONG' } })
    fireEvent.click(screen.getByTestId('admin-modal-submit'))

    // onConfirm should not be called because the button should still be disabled or handleConfirm returns early
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('renders nothing when open is false', () => {
    render(<ConfirmDialog {...defaultProps} open={false} />)
    expect(screen.queryByText('Confirm Deletion')).not.toBeInTheDocument()
  })
})
