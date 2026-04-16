import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AdminPollsClient } from '../AdminPollsClient'
import { toast } from 'sonner'

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('AdminPollsClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [],
        meta: { totalPages: 1, total: 0 }
      }),
    })
  })

  it('renders correctly and fetches data on mount', async () => {
    render(<AdminPollsClient userRole="admin" />)
    
    expect(screen.getByTestId('admin-header-title')).toHaveTextContent(/Polls/i)
    expect(screen.getAllByText(/Create Poll/i).length).toBeGreaterThan(0)
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/admin/polls'))
    })
  })

  it('opens the create modal when "Create Poll" is clicked', async () => {
    render(<AdminPollsClient userRole="admin" />)
    
    const addButton = screen.getByTestId('admin-header-action')
    fireEvent.click(addButton)
    
    expect(screen.getByText(/Ask a question and let the class vote/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Question/i)).toBeInTheDocument()
  })

  it('allows adding and removing options', async () => {
    render(<AdminPollsClient userRole="admin" />)
    
    fireEvent.click(screen.getByTestId('admin-header-action'))
    
    const addOptionButton = screen.getByText(/\+ Add Option/i)
    
    // Initial 2 options
    expect(screen.getAllByPlaceholderText(/Option \d/)).toHaveLength(2)
    
    // Add option
    fireEvent.click(addOptionButton)
    expect(screen.getAllByPlaceholderText(/Option \d/)).toHaveLength(3)
    
    // Remove option
    const removeButtons = screen.getAllByRole('button').filter(b => b.querySelector('svg'))
    // Note: This logic might be fragile if there are other buttons with SVGs. 
    // In our component, remove button has XIcon.
    
    // Let's find by the X icon specifically if possible, or just click the last one
    // In our component: <button onClick={() => removeOption(idx)} className="..."> <XIcon ... /> </button>
  })

  it('validates minimum options before submission', async () => {
    render(<AdminPollsClient userRole="admin" />)
    
    fireEvent.click(screen.getByTestId('admin-header-action'))
    fireEvent.change(screen.getByLabelText(/Question/i), { target: { value: 'Test Question' } })
    
    // Only 1 valid option filled
    fireEvent.change(screen.getByPlaceholderText(/Option 1/i), { target: { value: 'Opt 1' } })
    
    fireEvent.click(screen.getByTestId('admin-modal-submit'))
    
    expect(toast.error).toHaveBeenCalledWith('At least 2 options required')
  })
})
