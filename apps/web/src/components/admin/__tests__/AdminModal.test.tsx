import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AdminModal } from '../AdminModal'

// Mock Portal to render children inline instead of via createPortal
vi.mock('@/components/ui/Portal', () => ({
  Portal: ({ children }: { children: React.ReactNode }) => <div data-testid="portal">{children}</div>,
}))

describe('AdminModal', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    title: 'Test Modal',
    children: <p>Modal content</p>,
  }

  it('renders title and children when open', () => {
    render(<AdminModal {...defaultProps} />)
    expect(screen.getByText('Test Modal')).toBeInTheDocument()
    expect(screen.getByText('Modal content')).toBeInTheDocument()
  })

  it('renders nothing when open is false', () => {
    render(<AdminModal {...defaultProps} open={false} />)
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(<AdminModal {...defaultProps} description="Some helpful text" />)
    expect(screen.getByText('Some helpful text')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<AdminModal {...defaultProps} onClose={onClose} />)

    // Find the close button (X icon button)
    const buttons = screen.getAllByRole('button')
    const closeBtn = buttons.find(b => !b.getAttribute('data-testid'))
    fireEvent.click(closeBtn!)
    expect(onClose).toHaveBeenCalled()
  })

  it('renders submit button when onSubmit is provided', () => {
    const onSubmit = vi.fn()
    render(<AdminModal {...defaultProps} onSubmit={onSubmit} submitLabel="Create" />)

    const submitBtn = screen.getByTestId('admin-modal-submit')
    expect(submitBtn).toHaveTextContent('Create')
    fireEvent.click(submitBtn)
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('disables submit button when submitDisabled is true', () => {
    render(<AdminModal {...defaultProps} onSubmit={vi.fn()} submitDisabled={true} />)
    expect(screen.getByTestId('admin-modal-submit')).toBeDisabled()
  })

  it('disables submit button when submitLoading is true', () => {
    render(<AdminModal {...defaultProps} onSubmit={vi.fn()} submitLoading={true} />)
    expect(screen.getByTestId('admin-modal-submit')).toBeDisabled()
  })

  it('renders Cancel button that calls onClose', () => {
    const onClose = vi.fn()
    render(<AdminModal {...defaultProps} onClose={onClose} onSubmit={vi.fn()} />)

    const cancelBtn = screen.getByText('Cancel')
    fireEvent.click(cancelBtn)
    expect(onClose).toHaveBeenCalled()
  })

  it('closes on Escape key press', () => {
    const onClose = vi.fn()
    render(<AdminModal {...defaultProps} onClose={onClose} />)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
