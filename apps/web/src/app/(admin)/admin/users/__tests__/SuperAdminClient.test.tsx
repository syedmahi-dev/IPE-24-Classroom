import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SuperAdminClient } from '../SuperAdminClient'
import { toast } from 'sonner'
import * as actions from '../actions'

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
}))

vi.mock('../actions', () => ({
  addWhitelistedStudent: vi.fn(),
  changeUserRole: vi.fn(),
}))

const mockUsers = [
  { id: '1', name: 'Super User', email: 'super@iut.edu', role: 'super_admin', createdAt: new Date() },
  { id: '2', name: 'Admin User', email: 'admin@iut.edu', role: 'admin', createdAt: new Date() },
  { id: '3', name: 'Student User', email: 'student@iut.edu', role: 'student', createdAt: new Date() },
]

describe('SuperAdminClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders stats correctly', () => {
    render(<SuperAdminClient initialUsers={mockUsers} />)
    
    expect(screen.getByText(/Total Users/i)).toBeInTheDocument()
    const stats = screen.getAllByTestId('stat-value')
    expect(stats[0]).toHaveTextContent('3') // Total
    expect(stats[1]).toHaveTextContent('1') // Admins
    expect(stats[2]).toHaveTextContent('1') // Students
  })

  it('filters users based on search input', async () => {
    render(<SuperAdminClient initialUsers={mockUsers} />)
    
    const searchInput = screen.getByTestId('admin-table-search-input')
    fireEvent.change(searchInput, { target: { value: 'Student' } })
    
    expect(screen.getAllByText(/Student User/i).length).toBeGreaterThan(0)
    expect(screen.queryByText(/Admin User/i)).not.toBeInTheDocument()
  })

  it('opens whitelist modal and validates input', async () => {
    render(<SuperAdminClient initialUsers={mockUsers} />)
    
    const addButton = screen.getByText(/Add Student/i)
    fireEvent.click(addButton)
    
    expect(screen.getByText(/Whitelist Student/i)).toBeInTheDocument()
    
    const submitBtn = screen.getByTestId('admin-modal-submit')
    
    // Test validation
    fireEvent.change(screen.getByLabelText(/Student Email/i), { target: { value: 'invalid' } })
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Test' } })
    
    fireEvent.click(submitBtn)
    expect(toast.error).toHaveBeenCalledWith('Valid email is required.')
  })

  it('calls addWhitelistedStudent action successfully', async () => {
    vi.mocked(actions.addWhitelistedStudent).mockResolvedValue({ success: true })
    
    render(<SuperAdminClient initialUsers={mockUsers} />)
    
    fireEvent.click(screen.getByText(/Add Student/i))
    
    fireEvent.change(screen.getByLabelText(/Student Email/i), { target: { value: 'new@iut.edu' } })
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'New Student' } })
    
    fireEvent.click(screen.getByTestId('admin-modal-submit'))
    
    await waitFor(() => {
      expect(actions.addWhitelistedStudent).toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith('Student whitelisted successfully!')
    })
  })

  it('calls changeUserRole when role select changes', async () => {
    vi.mocked(actions.changeUserRole).mockResolvedValue({ success: true })
    
    render(<SuperAdminClient initialUsers={mockUsers} />)
    
    const selects = screen.getAllByRole('combobox')
    // We want the select for Student User (which has id 3). 
    // It's likely the last one if we have desktop/mobile.
    
    // Better to find by current value if unique-ish or just try the last one
    const studentSelect = selects[selects.length - 1]
    fireEvent.change(studentSelect, { target: { value: 'admin' } })
    
    expect(actions.changeUserRole).toHaveBeenCalledWith('3', 'admin')
  })
})
