import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AdminExamsClient } from '../AdminExamsClient'
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

describe('AdminExamsClient', () => {
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
    render(<AdminExamsClient courses={mockCourses} />)
    
    expect(screen.getByTestId('admin-header-title')).toHaveTextContent(/Exams/i)
    expect(screen.getByTestId('admin-header-action')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/admin/exams'))
    })
  })

  it('opens the create modal when action button is clicked', async () => {
    render(<AdminExamsClient courses={mockCourses} />)
    
    fireEvent.click(screen.getByTestId('admin-header-action'))
    
    expect(screen.getByText(/Schedule a new exam/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Course/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Date & Time/i)).toBeInTheDocument()
  })

  it('validates required fields before submission', async () => {
    render(<AdminExamsClient courses={mockCourses} />)
    
    fireEvent.click(screen.getByTestId('admin-header-action'))
    fireEvent.click(screen.getByTestId('admin-modal-submit'))
    
    expect(toast.error).toHaveBeenCalledWith('Title is required')
  })

  it('submits a new exam successfully', async () => {
    render(<AdminExamsClient courses={mockCourses} />)
    
    fireEvent.click(screen.getByTestId('admin-header-action'))
    
    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'Midterm Exam' } })
    fireEvent.change(screen.getByLabelText(/Date & Time/i), { target: { value: '2024-05-20T10:00' } })
    
    fireEvent.click(screen.getByTestId('admin-modal-submit'))
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/admin/exams',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"title":"Midterm Exam"')
        })
      )
      expect(toast.success).toHaveBeenCalledWith('Exam created')
    })
  })
})
