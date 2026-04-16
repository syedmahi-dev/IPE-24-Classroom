import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AdminAuditLogClient } from '../AdminAuditLogClient'
import { toast } from 'sonner'

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('AdminAuditLogClient', () => {
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
    render(<AdminAuditLogClient userRole="admin" />)
    
    expect(screen.getByTestId('admin-header-title')).toHaveTextContent(/Audit Log/i)
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/admin/audit-log'))
    })
  })

  it('shows export button for super_admin but not for admin', () => {
    const { rerender } = render(<AdminAuditLogClient userRole="admin" />)
    expect(screen.queryByText(/Export CSV/i)).not.toBeInTheDocument()
    
    rerender(<AdminAuditLogClient userRole="super_admin" />)
    expect(screen.getByText(/Export CSV/i)).toBeInTheDocument()
  })

  it('updates data when search input changes', async () => {
    render(<AdminAuditLogClient userRole="admin" />)
    
    const searchInput = screen.getByTestId('admin-table-search-input')
    fireEvent.change(searchInput, { target: { value: 'Mahi' } })
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('search=Mahi'))
    })
  })

  it('updates data when action filter changes', async () => {
    render(<AdminAuditLogClient userRole="admin" />)
    
    const filterSelect = screen.getByRole('combobox')
    fireEvent.change(filterSelect, { target: { value: 'CREATE' } })
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('action=CREATE'))
    })
  })
})
