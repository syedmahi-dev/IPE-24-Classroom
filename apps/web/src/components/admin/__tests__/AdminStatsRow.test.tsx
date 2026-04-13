import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { AdminStatsRow } from '../AdminStatsRow'

describe('AdminStatsRow', () => {
  const mockStats = {
    students: 52,
    admins: 2,
    announcements: 18,
    files: 47,
    polls: 2
  }

  it('renders student, announcements, files, and polls for standard admin', () => {
    render(<AdminStatsRow stats={mockStats} role="admin" />)
    
    expect(screen.getByText('52')).toBeInTheDocument()
    expect(screen.getByText('18')).toBeInTheDocument()
    expect(screen.getByText('47')).toBeInTheDocument()
    expect(screen.getByText('2 active')).toBeInTheDocument()
    
    // Standard admins shouldn't see the "Admins" stat typically, 
    // or maybe they do, but let's assert what they see.
    expect(screen.queryByText('ADMINS')).not.toBeInTheDocument()
  })

  it('renders extended stats including admins for super_admin', () => {
    render(<AdminStatsRow stats={mockStats} role="super_admin" />)
    
    // CRs get the extra "Admin" count tile
    expect(screen.getByText('ADMINS')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })
})
