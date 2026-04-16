import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AdminFilesClient } from '../AdminFilesClient'
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

const mockConnectedDrives = [
  { id: 'drive-1', label: 'Class Drive', email: 'drive@iut-dhaka.edu' },
]

describe('AdminFilesClient', () => {
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
    render(<AdminFilesClient courses={mockCourses} connectedDrives={mockConnectedDrives} />)
    
    expect(screen.getByTestId('admin-header-title')).toHaveTextContent(/Files/i)
    expect(screen.getByTestId('admin-header-action')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/admin/files'))
    })
  })

  it('opens the upload modal when action button is clicked', async () => {
    render(<AdminFilesClient courses={mockCourses} connectedDrives={mockConnectedDrives} />)
    
    fireEvent.click(screen.getByTestId('admin-header-action'))
    
    expect(screen.getByText(/Upload a file to Google Drive and share with students/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Display Name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Course/i)).toBeInTheDocument()
  })

  it('validates file selection before submission', async () => {
    render(<AdminFilesClient courses={mockCourses} connectedDrives={mockConnectedDrives} />)
    
    fireEvent.click(screen.getByTestId('admin-header-action'))
    
    // Submit button is disabled by default if no file selected in AdminFilesClient
    const submitBtn = screen.getByTestId('admin-modal-submit')
    expect(submitBtn).toBeDisabled()
  })

  it('submits a new file successfully', async () => {
    render(<AdminFilesClient courses={mockCourses} connectedDrives={mockConnectedDrives} />)
    
    fireEvent.click(screen.getByTestId('admin-header-action'))
    
    const file = new File(['hello'], 'hello.png', { type: 'image/png' })
    const fileInput = screen.getByLabelText(/File/i)
    
    fireEvent.change(fileInput, { target: { files: [file] } })
    fireEvent.change(screen.getByLabelText(/Display Name/i), { target: { value: 'Test Logo' } })
    
    fireEvent.click(screen.getByTestId('admin-modal-submit'))
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/admin/files',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData)
        })
      )
      expect(toast.success).toHaveBeenCalledWith('File uploaded successfully')
    })
  })
})
