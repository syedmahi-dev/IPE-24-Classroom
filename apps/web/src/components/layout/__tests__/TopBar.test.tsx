import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { TopBar } from '../TopBar'

describe('TopBar', () => {
  const mockUser = {
    id: 'user-1',
    name: 'Rafiq Islam',
    email: 'rafiq@iut-dhaka.edu',
    role: 'student'
  }

  it('renders standard user profile', () => {
    render(<TopBar user={mockUser} />)
    
    // Should show user initials image (name is URL-encoded in the dicebear URL)
    expect(screen.getByRole('img')).toHaveAttribute('src', expect.stringContaining('Rafiq%20Islam'))
    
    // Should NOT show CR badge or Telegram bot pill
    expect(screen.queryByText('CR')).not.toBeInTheDocument()
    expect(screen.queryByText('Telegram')).not.toBeInTheDocument()
  })

  it('renders CR badge and Telegram status for admin', () => {
    const adminUser = { ...mockUser, role: 'admin' }
    render(<TopBar user={adminUser} />)
    
    // Should show the CR Panel badge
    expect(screen.getByTestId('topbar-role-badge')).toHaveTextContent(/CR Panel/)
    // Should show Telegram status for admin
    expect(screen.getByText(/Telegram Synced/i)).toBeInTheDocument()
  })

  it('renders Super Admin badge for super_admin', () => {
    const saUser = { ...mockUser, role: 'super_admin' }
    render(<TopBar user={saUser} />)
    
    expect(screen.getByTestId('topbar-role-badge')).toHaveTextContent(/Super Admin/)
    // Telegram status is only for 'admin' (CR) in the current component
    expect(screen.queryByText(/Telegram Synced/i)).not.toBeInTheDocument()
  })
})
