import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AdminAnnouncementsClient } from '../AdminAnnouncementsClient'
import { toast } from 'sonner'

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockCourses = [
  { id: '1', code: 'IPE 101', name: 'Intro to IPE' },
]

describe('AdminAnnouncementsClient', () => {
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
    render(<AdminAnnouncementsClient courses={mockCourses} />)
    
    expect(screen.getByTestId('admin-header-title')).toHaveTextContent(/Announcements/i)
    expect(screen.getAllByText(/New Announcement/i).length).toBeGreaterThan(0)
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/admin/announcements'))
    })
  })

  it('opens the create modal when "New Announcement" is clicked', async () => {
    render(<AdminAnnouncementsClient courses={mockCourses} />)
    
    const addButton = screen.getByTestId('admin-header-action')
    fireEvent.click(addButton)
    
    expect(screen.getAllByText(/New Announcement/i).length).toBeGreaterThan(0)
    expect(screen.getByLabelText(/Title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Body/i)).toBeInTheDocument()
  })

  it('validates required fields before submission', async () => {
    render(<AdminAnnouncementsClient courses={mockCourses} />)
    
    fireEvent.click(screen.getByTestId('admin-header-action'))
    fireEvent.click(screen.getByTestId('admin-modal-submit'))
    
    expect(toast.error).toHaveBeenCalledWith('Title and body are required')
  })

  it('submits a new announcement successfully', async () => {
    render(<AdminAnnouncementsClient courses={mockCourses} />)
    
    fireEvent.click(screen.getByTestId('admin-header-action'))
    
    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'New Test' } })
    fireEvent.change(screen.getByLabelText(/Body/i), { target: { value: 'Test body content' } })
    
    fireEvent.click(screen.getByTestId('admin-modal-submit'))
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/admin/announcements',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ title: 'New Test', body: 'Test body content', type: 'general', isPublished: true })
        })
      )
      expect(toast.success).toHaveBeenCalledWith('Announcement created')
    })
  })
})
