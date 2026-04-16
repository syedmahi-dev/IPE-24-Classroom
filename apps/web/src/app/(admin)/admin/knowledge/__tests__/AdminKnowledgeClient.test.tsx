import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AdminKnowledgeClient } from '../AdminKnowledgeClient'
import { toast } from 'sonner'

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('AdminKnowledgeClient', () => {
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
    render(<AdminKnowledgeClient userRole="admin" />)
    
    expect(screen.getByTestId('admin-header-title')).toHaveTextContent(/Knowledge Base/i)
    expect(screen.getByTestId('admin-header-action')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/admin/knowledge'))
    })
  })

  it('opens the create modal when action button is clicked', async () => {
    render(<AdminKnowledgeClient userRole="admin" />)
    
    fireEvent.click(screen.getByTestId('admin-header-action'))
    
    expect(screen.getByText(/Add a document to the AI chatbot's knowledge base/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Content/i)).toBeInTheDocument()
  })

  it('validates required fields before submission', async () => {
    render(<AdminKnowledgeClient userRole="admin" />)
    
    fireEvent.click(screen.getByTestId('admin-header-action'))
    fireEvent.click(screen.getByTestId('admin-modal-submit'))
    
    expect(toast.error).toHaveBeenCalledWith('Title and content are required')
  })

  it('submits a new document successfully', async () => {
    render(<AdminKnowledgeClient userRole="admin" />)
    
    fireEvent.click(screen.getByTestId('admin-header-action'))
    
    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'New Doc' } })
    fireEvent.change(screen.getByLabelText(/Content/i), { target: { value: 'This is the document content' } })
    
    fireEvent.click(screen.getByTestId('admin-modal-submit'))
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/admin/knowledge',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ title: 'New Doc', sourceType: 'other', content: 'This is the document content' })
        })
      )
      expect(toast.success).toHaveBeenCalledWith('Document added')
    })
  })
})
