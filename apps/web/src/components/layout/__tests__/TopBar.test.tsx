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
    
    // Should show user initials image
    expect(screen.getByRole('img')).toHaveAttribute('src', expect.stringContaining('Rafiq Islam'))
    
    // Should NOT show CR badge or Telegram bot pill
    expect(screen.queryByText('CR')).not.toBeInTheDocument()
    expect(screen.queryByText('Telegram')).not.toBeInTheDocument()
  })

  it('renders CR badge and Telegram status for super_admin', () => {
    const crUser = { ...mockUser, role: 'super_admin' }
    render(<TopBar user={crUser} />)
    
    // Should show the CR badge
    expect(screen.getByText(/◆ CR/)).toBeInTheDocument()
    // Should have an indicator denoting telegram connectivity (can be just text or aria-label for now)
    expect(screen.getByText(/telegram/i)).toBeInTheDocument()
  })
})
